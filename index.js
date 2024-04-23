import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";

// https://www.useragents.me/#latest-windows-desktop-useragents
const userAgentStrings = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.3",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.3",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.3",
];

// Create an instance of the StealthPlugin
const stealthPlugin = StealthPlugin();
chromium.use(stealthPlugin);

const apiKey = ''; // insert api key
const userAgent = userAgentStrings[Math.floor(Math.random() * userAgentStrings.length)];
const PROXY_DNS = ''; // insert dns
const PROXY_PORT = ''; // insert port
const PROXY_USERNAME = ''; // insert username
const PROXY_PASSWORD = ''; // insert password

chromium.launch({ headless: false, channel: "chrome" }).then(async browser => {
    const context = await browser.newContext()
    let page = await context.newPage()

    // Set custom headers - specify user agent
    await page.setExtraHTTPHeaders({
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9'
    });

    // --------------------------------- START -------------------------------------------------
    const proxyAddress = await getProxyAddress(PROXY_DNS, PROXY_PORT, PROXY_USERNAME, PROXY_PASSWORD)
    await new Promise(resolve =>
        setTimeout(resolve, Math.floor(Math.random() * 9000 + 1000))
    );

    const proxy = { address: proxyAddress, port: PROXY_PORT, username: PROXY_USERNAME, password: PROXY_PASSWORD }

    // ------------------------------ GO TO CNC CMA WEBSITE -------------------------------------------------
    await page.goto("https://www.cnc-line.com/");

    // ------------------------------ SOLVE DATADOME SLIDER CAPTCHA  -------------------------------------------------
    const frame = page.locator('iframe')
    if (frame) {

        // ------------------------------ UPLOAD CAPTCHA -------------------------------------------------
        const captchaUrl = await frame.getAttribute('src')
        const pageUrl = page.url()
        const captchaResponse = await uploadDataDomeSliderCaptcha(captchaUrl, pageUrl, proxy)

        // ------------------------------ GET RESULT -------------------------------------------------
        let captchaResult = null;
        do {
            // Wait for a random interval before checking CAPTCHA status
            await new Promise(resolve =>
                setTimeout(resolve, Math.floor(Math.random() * 20000 + 5000))
            );

            // ------------------------ V1 ------------------------
            captchaResult = await getCaptchaResult(apiKey, captchaResponse.request)

            // ------------------------ V2 ------------------------
            // captchaResult = await getCaptchaResult(apiKey, captchaResponse.taskId)

            console.log("CAPTCHA result:", captchaResult);
            if (captchaResult.status === 'ready') {

                // ------------------------ V1 ------------------------
                console.log('solution:', captchaResult.request)
                const cookie = getCookie(captchaResult.request)

                // ------------------------ V2 ------------------------
                // console.log('solution:', captchaResult.solution)
                // const cookie = getCookie(captchaResult.solution)

                console.log('cookie:', cookie)
                await page.context().addCookies([cookie])
                console.log('Added cookies:', await page.context().cookies())
                return
            }
            // ------------------------ V1 ------------------------
        } while (captchaResult.status === 0 && captchaResult.request === 'CAPCHA_NOT_READY')

        // ------------------------ V2 ------------------------
        // } while (captchaResult.status === 'processing')
    }
})

async function getProxyAddress(host, port, username, password) {
    try {
        const res = await axios.get('http://ip-api.com/json', {
            proxy: {
                protocol: 'http',
                host: host,
                port: port,
                auth: {
                    username,
                    password,
                },
            },
        });
        console.log(res.data.query);
        return res.data.query;
    } catch (err) {
        console.error(err);
        throw err; // Rethrow the error to propagate it
    }
}

// https://2captcha.com/api-docs/datadome-slider-captcha
async function uploadDataDomeSliderCaptcha(captchaUrl, websiteUrl, proxy) {
    //! both versions' result are unsolvable

    // ------------------------------ V1 -------------------------------------------
    const url = 'https://2captcha.com/in.php'
    const proxyAddress = proxy.address
    const proxyPort = proxy.port
    const proxyLogin = proxy.username
    const proxyPassword = proxy.password

    const requestBody =
    {
        key: apiKey,
        method: "datadome",
        captcha_url: captchaUrl,
        pageurl: websiteUrl,
        proxy: `${proxyLogin}:${proxyPassword}@${proxyAddress}:${proxyPort}`,
        proxytype: "http",
        userAgent: userAgent,
        json: 1
    }

    // ------------------------------ V2 -------------------------------------------

    // const url ='http://api.2captcha.com/createTask'
    // const requestBody = {
    //     clientKey: apiKey,
    //     task: {
    //         type: "DataDomeSliderTask",
    //         websiteURL: websiteUrl,
    //         captchaUrl: captchaUrl,
    //         userAgent: userAgent,
    //         proxyType: "http",
    //         proxyAddress: proxy.address,
    //         proxyPort: proxy.port,
    //         proxyLogin: proxy.username,
    //         proxyPassword: proxy.password
    //     }
    // };
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

async function getCaptchaResult(apiKey, captchaId) {
    //! both versions' result are unsolvable

    // ------------------------------ V1 -------------------------------------------
    const url = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Failed to fetch captcha solution: ' + error.message);
    }

    // ------------------------------ V2 -------------------------------------------

    // const url = `https://2captcha.com/getTaskResult`;
    // const requestBody = {
    //     clientKey: apiKey,
    //     taskId: taskId,
    // }
    // try {
    //     const response = await fetch(url, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify(requestBody)
    //     });

    //     const data = await response.json();
    //     return data;
    // } catch (error) {
    //     console.error('Error:', error);
    //     throw error;
    // }
}

function getCookie(result) {
    let cookieObject = {}

    const splitCookie = result.split(';').map(cookie => cookie.trim())

    splitCookie.map((cookie, index) => {
        const [key, value] = cookie.split('=')

        if (index === 0) {
            cookieObject['name'] = key
            cookieObject['value'] = value
        } else {

            if (key === 'Secure') {
                cookieObject['secure'] = true
            } else if (key === 'Max-Age') {
                cookieObject['expires'] = Math.round(Date.now() / 1000) + parseInt(value)
            }
            else {
                cookieObject[lowercaseFirstLetter(key)] = value
            }
        }
    })
    return cookieObject;
}

function lowercaseFirstLetter(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
}