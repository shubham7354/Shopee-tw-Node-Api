const express = require('express');
const { connect } = require("puppeteer-real-browser");

const app = express();
const PORT = 5002;

// Middleware to parse incoming JSON requests
app.use(express.json());

// API endpoint to take URL and return the HTML response
app.get('/GetHtml', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ message: 'URL parameter is required' });
        }

        //console.log('Received URL:', url);

        // Call the function that interacts with Puppeteer and returns the captured response
        let response = await getHtmlAndCaptureResponse(url);

        // Send the captured response body back in the API response
        res.send(response);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error processing the URL' });
    }
});

// Function that interacts with Puppeteer to capture and return the network response body
async function getHtmlAndCaptureResponse(url) {
    return new Promise(async (resolve, reject) => {
        let attempts = 0;
        let page;
        let browser;

        try {
            // Retry logic in case of failure
            await getHtmlInnerFunction();

            async function getHtmlInnerFunction() {
                attempts++;

                console.log('Attempt:', attempts);

                if (attempts === 1) { // Open browser only on first attempt
                    const result = await connect({
                        headless: false,
                        args: [],
                        customConfig: {},
                        turnstile: true,
                        connectOption: {},
                        disableXvfb: false,
                        ignoreAllFlags: false
                    });

                    page = result.page;
                    browser = result.browser;
                }

                // Enable request interception to capture all requests
                await page.setRequestInterception(true);

                // Capture and log network requests
                page.on('request', (request) => {
                    console.log('Request:', request.url());
                    // Ignore non-API requests (e.g., images, styles, etc.)
                    if (request.url().endsWith('.png') || request.url().endsWith('.jpg') || request.url().endsWith('.css') || request.url().endsWith('.js')) {
                        request.abort();  // Abort non-API requests
                    } else {
                        request.continue();  // Continue with API requests
                    }
                });

                // Variable to hold the response body for the relevant request
                let capturedResponseBody = null;

                // Capture and log network responses
                page.on('response', async (response) => {
                    const responseUrl = response.url();

                    // Check if the response URL matches the pattern (you can modify this)
                    if (responseUrl.startsWith('https://shopee.tw/api/v4/pdp/get_pc?item_id=')) {
                        console.log('Captured response for:', responseUrl);

                        try {
                            // Get the response body as text (if it's JSON, you can also use `response.json()` instead)
                            const body = await response.text();

                            // Log the body (optional, for debugging)
                            console.log('Response body:', body);

                            // Store the captured body
                            capturedResponseBody = body;
                        } catch (error) {
                            console.log('Error fetching response body:', error);
                        }
                    }
                });

                // Navigate to the provided URL
                await page.goto(url, { timeout: 0 });

                // Wait for the page to load completely
                await page.waitForSelector('body');  // Use a specific selector like 'body' to ensure the page has loaded

                // Check if we successfully captured the response
                if (capturedResponseBody) {
                    // Resolve with the captured response body
                    resolve(capturedResponseBody);
                } else {
                    reject('No matching response captured');
                }

                // Optionally, close the browser
                await browser.close();
            }
        } catch (error) {
            if (attempts > 3) {
                await browser.close();
                reject('Failed after 3 attempts');
            } else {
                console.error('Error:', error);
                await sleep(3000); // Retry after 3 seconds
                getHtmlInnerFunction();
            }
        }
    });
}

// Helper function to add delay (sleep)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
