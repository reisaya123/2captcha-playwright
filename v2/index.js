import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import getUserAgent from "../utils/userAgents.js";
import getCookie from "../utils/getCookie.js";

// Create an instance of the StealthPlugin
const stealthPlugin = StealthPlugin();
chromium.use(stealthPlugin);

const apiKey = process.env.API_KEY; // insert api key
const userAgent = getUserAgent()
const PROXY_DNS = process.env.PROXY_DNS; // insert dns
const PROXY_PORT = process.env.PROXY_PORT; // insert port
const PROXY_USERNAME = process.env.PROXY_USERNAME; // insert username
const PROXY_PASSWORD = process.env.PROXY_PASSWORD; // insert password

chromium.launch({
    headless: false,
    proxy: {
        server: `${PROXY_DNS}:${PROXY_PORT}`,
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD
    }
}).then(async browser => {
    const context = await browser.newContext()
    let page = await context.newPage()

    // Set custom headers - specify user agent
    await page.setExtraHTTPHeaders({
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9'
    });

    // --------------------------------- START -------------------------------------------------
    const proxy = { address: PROXY_DNS, port: PROXY_PORT, username: PROXY_USERNAME, password: PROXY_PASSWORD }

    // ------------------------------ GO TO CNC CMA WEBSITE -------------------------------------------------
    await page.goto("https://www.cnc-line.com/");

    // ------------------------------ SOLVE DATADOME SLIDER CAPTCHA  -------------------------------------------------
    const frame = page.locator('iframe')
    if (frame) {

        // ------------------------------ UPLOAD CAPTCHA -------------------------------------------------
        const captchaUrl = await frame.getAttribute('src')
        const pageUrl = page.url()

        // ------------------------------ GET RESULT -------------------------------------------------
        let captchaResult = null;
        const captchaResponse = await uploadDataDomeSliderCaptcha(captchaUrl, pageUrl, proxy)

        // Wait for a random interval before checking CAPTCHA status
        await new Promise(resolve =>
            setTimeout(resolve, Math.floor(Math.random() * 20000 + 5000))
        );

        do {
            captchaResult = await getCaptchaResult(apiKey, captchaResponse.taskId)
            console.log("CAPTCHA result:", captchaResult);

            // Retry if CAPTCHA is not ready
            if (captchaResult.status === 'processing') {
                console.log("CAPTCHA not ready. Retrying...");
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.floor(Math.random() * 5000 + 1000))
                );
            } else if (captchaResult.status === 0 && captchaResult.request === "ERROR_CAPTCHA_UNSOLVABLE") {
                console.log(captchaResult.error_text)
                return;
            } else if (captchaResult.status === 'ready') {
                const cookie = getCookie(captchaResult.solution.cookie)
                await page.context().addCookies([cookie])
                console.log('Added cookies:', await page.context().cookies())
                await page.reload()
                return
            }
        } while (captchaResult.status === 'processing')
    }
})

// https://2captcha.com/api-docs/datadome-slider-captcha
async function uploadDataDomeSliderCaptcha(captchaUrl, websiteUrl, proxy) {
    const url = 'http://api.2captcha.com/createTask'
    const requestBody = {
        clientKey: apiKey,
        task: {
            type: "DataDomeSliderTask",
            websiteURL: websiteUrl,
            captchaUrl: captchaUrl,
            userAgent: userAgent,
            proxyType: "http",
            proxyAddress: proxy.address,
            proxyPort: proxy.port,
            proxyLogin: proxy.username,
            proxyPassword: proxy.password
        }
    };
    console.log('Request body:', requestBody);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('Captcha task created:', data);
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function getCaptchaResult(apiKey, taskId) {
    const url = `https://2captcha.com/getTaskResult`;
    const requestBody = {
        clientKey: apiKey,
        taskId: taskId,
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}