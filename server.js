require("dotenv").config();
var axios = require("axios");

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const PASSWORD = process.env.PASSWORD;
const HOST_NAME = process.env.HOST_NAME;
const SHOPIFY_URL = "https://" + SHOPIFY_API_KEY + ":" + PASSWORD + "@" + HOST_NAME + ".myshopify.com/admin/products.json?fields=id,title";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const APP_NAME = process.env.APP_NAME;
const TABLE_NAME = process.env.TABLE_NAME;
const AIRTABLE_URL = "https://api.airtable.com/v0/"+ APP_NAME + "/" + TABLE_NAME + "?api_key=" + AIRTABLE_API_KEY;

axios.all([getShopify(), getAirtable()])
    .then(axios.spread(function(shopify, airtable) {
        // Compares the list of current products with the list of current Airtable records
        // Updates and makes changes and marks item complete
        for (var i in shopify) {
            for (var j in airtable) {
                if (shopify[i].id == airtable[j].id) {
                    patchAirtable(airtable[j].airtable_id, shopify[i].title);
                    shopify[i].complete = true;
                }
            }
        }

        // Check for new Products (i.e. incomplete records) and create them
        for (var k in shopify) {
            if (!(shopify[k].hasOwnProperty("complete"))) {
                postAirtable(shopify[k].id, shopify[k].title);
                shopify[k].complete = true;
            }
        }
    }));

// Retrieves a list of all products from the Shopify store with their ID and Title
function getShopify() {
    return axios.get(SHOPIFY_URL).then(function(response) {
        const products = response.data.products;
        const products_array = [];
        for (var a in products) {
            products_array.push(products[a]);
        }
        return products_array;
    });
}

// Retrieves all the records from an Airtable and returns the record ID and the Shopify product ID
function getAirtable() {
    return axios.get(AIRTABLE_URL).then(function(response) {
        const records = response.data.records;
        const records_array = [];
        for (var a in records) {
            records_array.push({ "airtable_id": records[a].id, "id": records[a].fields.shopify_id });
        }
        return records_array;
    });
}

// Updates a single Airtable record
function patchAirtable(airtable_id, product_title) {
    axios.patch("https://api.airtable.com/v0/" + APP_NAME + "/" + TABLE_NAME + "/" + airtable_id + "?api_key=" + AIRTABLE_API_KEY, {
        "fields": {
            "product_title": product_title
        }
    });
}


// Create a single Airtable record
function postAirtable(shopify_id, product_title) {
    axios.post(AIRTABLE_URL, {
        "fields": {
            "shopify_id": shopify_id,
            "product_title": product_title
        }
    }).catch(function (error) { console.log(error); });
}
