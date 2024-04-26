import lowercaseFirstLetter from "./lowercaseFirstLetter.js"

export default function getCookie(result) {
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