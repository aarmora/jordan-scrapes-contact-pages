import puppeteer, { Browser, Page } from 'puppeteer';
import { getPropertyByHandle, setUpNewPage } from 'puppeteer-helpers';


(async () => {
    try {
        let browser: Browser;
        let ubuntu = false;
        let headless = false;
        if (process.argv[2] === 'ubuntu' || process.argv[3] === 'ubuntu') {
            ubuntu = true;
        }
        if (process.argv[2] === 'headless' || process.argv[3] === 'headless') {
            headless = true;
        }
        if (ubuntu) {
            browser = await puppeteer.launch({ headless: true, args: [`--window-size=${1800},${1200}`, '--no-sandbox', '--disable-setuid-sandbox'] });
        }
        else {
            browser = await puppeteer.launch({ headless: headless, args: [`--window-size=${1800},${1200}`] });
        }
        const page = await setUpNewPage(browser);

        await page.goto('http://clenera.com');

        // Check the home page to see if it has a phone number
        let potentialPhoneNumbers: any = await getPhoneNumber(page);

        // Search for contact pages and phone numbers there
        potentialPhoneNumbers = await getPhoneNumbersFromContactPage(page, browser, potentialPhoneNumbers);

        console.log('potential phone numbers', potentialPhoneNumbers);

        await page.close();
        await browser.close();

        process.exit();


    }
    catch (e) {
        console.log('error in top try/catch', e);
    }


})();

/**
 * This will look for any contact pages, open them and scrape any phone numbers.
 * @param page 
 * @param browser 
 * @param phoneNumbers 
 */
export async function getPhoneNumbersFromContactPage(page: Page, browser: Browser, phoneNumbers: string[] = []): Promise<string[]> {
    // Get all the links and go to the contact pages to look for addresses
    const links = await page.$$('a');
    for (let link of links) {
        if ((await getPropertyByHandle(link, 'innerHTML')).toLowerCase().includes('contact')) {
            let contactUrl;
            try {
                contactUrl = await getPropertyByHandle(link, 'href');
                const contactPage = await setUpNewPage(browser);
                if (!contactUrl.includes('mailto:')) {
                    await contactPage.goto(contactUrl, {
                        waitUntil: 'networkidle0',
                        timeout: 3500
                    });
                    phoneNumbers = await getPhoneNumber(contactPage, phoneNumbers);
                }
                await contactPage.close();
            }
            catch (err) {
                console.log('Err while going to contact page', err, contactUrl);
            }
        }
    }

    return Promise.resolve(phoneNumbers);
}

/**
 * This will return an array of phone numbers
 * @param page
 */
export async function getPhoneNumber(page: Page, phoneNumbers: string[] = []): Promise<string[]> {
    const body = await getPropertyByHandle(await page.$('body'), 'innerHTML');
    const potentialPhoneNumbers = body.match(/(<a href.*?>.*?([(]?(\d{3})[)]?[(\s)?.-](\d{3})[\s.-](\d{4})).*?<\/a>)|([(]?(\d{3})[)]?[(\s)?.-](\d{3})[\s.-](\d{4}))/g);
    if (potentialPhoneNumbers) {
        for (let number of potentialPhoneNumbers) {
            // Check if we already have some of these numbers
            if (phoneNumbers.filter(phoneNumber => phoneNumber === number).length === 0) {
                phoneNumbers.push(number);
            }
        }
    }

    return Promise.resolve(phoneNumbers);
}