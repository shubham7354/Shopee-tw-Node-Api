const express = require('express');
const { connect } = require('puppeteer-real-browser');

const app = express();
const PORT = 5002;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Basic GET route

app.get('/GetHtml', async (req, res) => {
    try {

    // Grab params that are attached on the end of the /new/ route
      //const {url} = req.body;
      const url = req.query.url;
      const proxie = req.query.proxie;

      console.log('Received URL:', url);
      console.log('Received Proxy:', proxie);
      // Call GetHtml function with retry logic
      let response = await GetHtml(url,proxie);
  
      // If GetHtml succeeds, send the result
      res.send(response);
  
    } catch (error) {
      // If GetHtml fails after retries, send a failure response
      console.error('Failed after 3 attempts:', error);
  
      // Send a 500 status with an error message
      res.status(500).json({
        message: error
      });
    }
  });




async function GetHtml(url,proxie) {
return new Promise(async(resolve,reject)=>{
attempts = 0 ; 

let pageURL = url;

let page;

let  browser;
if (!proxie || proxie.split(':').length !== 4) {
  return reject('Invalid or missing proxy parameter');
}
const [host, port, username, password] = proxie.split(':');
await GetHtmlInnerFunction();

async function GetHtmlInnerFunction(){
try{

    attempts++; 
    
    console.log('Attmpts '+ attempts);

    if(attempts == 1){ //open browser 

       const result = await connect({

        headless: false,
      
        args: [],
      
        customConfig: {},
      
        turnstile: true,
      
        connectOption: {},
      
        disableXvfb: false,
        ignoreAllFlags: false,
        proxy:{
            host: host,
            port:port,
            username:username,
            password:password

        }
      
      })

      page = result.page;

      browser = result.browser;      

    }
    
    // Enable request interception to capture all requests
    await page.setRequestInterception(true);

    // Capture and log network requests
    page.on('request', (request) => {
        //console.log('Request:', request.url());
        request.continue();  // Continue the request
    });

    // Capture and log network responses
    page.on('response', async (response) => {
        const responseUrl = response.url();

        // Check if the response URL matches the pattern
        if (responseUrl.startsWith('https://shopee.tw/api/v4/pdp/get_pc?item_id=')) {
        //console.log('Captured response for:', responseUrl);
        
        try
        {
            // Get the response body as text (if it's JSON, you can also use `response.json()` instead)
            const body = await response.text();
            resolve ({body})
            //await browser.close();
        } catch (error) {
            console.log('Error fetching response body:', error);
        }
        }
    });

    await page.goto(pageURL,{timeout: 0});

    
    const check = await page.waitForSelector('[type="submit"]').catch(() => null);

    
    //let result = await page.evaluate(() => { return document.body.innerHTML });

    //const Cookies = await page.cookies();

    //let CookiesJson = JSON.stringify(Cookies);

    await browser.close();
    
    

}
catch(e){

    if(attempts>3){

      await browser.close();

      reject('Failed after 3 attempts');

    }
    else{

      console.log(e);

      await sleep(3000);
  
      GetHtmlInnerFunction();


    }

    

}

}

})


}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}




// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
