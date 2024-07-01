const axios = require('axios');
const cheerio = require('cheerio');

const scrapeWebsite = async (url) => {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const headings = $('h1, h2, h3, h4, h5, h6').map((i, el) => $(el).text().trim()).get();
        const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
        const links = $('a').map((i, el) => {
            const link = $(el).attr('href');
            const text = $(el).text().trim();
            return { link, text };
        }).get();

        return { headings, paragraphs, links };
    } catch (error) {
        throw new Error('Failed to scrape the website');
    }
};

module.exports = scrapeWebsite;
