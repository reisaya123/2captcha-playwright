# 2captcha-playwright

## Requirements 

Must have NodeJS (was using v20.10)

### How to run the project

- Create a `.env` file with the content:
    ```
    export API_KEY=
    export PROXY_DNS=
    export PROXY_PORT=
    export PROXY_USERNAME=
    export PROXY_PASSWORD=
    ```
- Load the environment variables: `source .env`
- Then install dependencies and run the project

    ```
    npm install

    # if you want to use v1 (https://2captcha.com/2captcha-api)
    npm run start-v1
    
    # if you want to use v2 (https://2captcha.com/api-docs/datadome-slider-captcha)
    npm run start-v2
    
    ```