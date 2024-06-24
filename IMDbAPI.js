const axios = require("axios");
const jsdom = require("jsdom");

class IMDbAPI {
  constructor() {
    this.url = "https://www.imdb.com";
    this.sourceDOM = null;
  }

  // Private method to fetch and parse HTML page
  async _getPage(url) {
    try {
      const { data: page } = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });
      const { JSDOM } = jsdom;
      this.sourceDOM = new JSDOM(page);
      return this.sourceDOM;
    } catch (error) {
      return error;
    }
  }

  // Private method to get IMDb ID from search query
  async _getIdFromSearch(search) {
    if (search === "") return "";
    if (/^tt\d{7,}$/.test(search)) return search;

    this.sourceDOM = await this._getPage(`${this.url}/find/?q=${search}`);
    if (this.sourceDOM) {
      try {
        const result = this.sourceDOM.window.document
          .querySelector(`div[class="ipc-metadata-list-summary-item__c"] div a`)
          .href.split("/")[2];
        return result;
      } catch (error) {
        return error;
      }
    } else {
      console.log("No title match found.");
      return "";
    }
  }

  // Private method to get detailed information about a title
  async _getDetails(imdb_id) {
    try {
      if (!this.sourceDOM) {
        this.sourceDOM = await this._getPage(`${this.url}/title/${imdb_id}`);
      }
      const details1 = JSON.parse(
        this.sourceDOM.window.document.querySelector(
          'script[type="application/ld+json"]'
        ).innerHTML
      );
      const details2 = JSON.parse(
        this.sourceDOM.window.document.querySelector(
          'script[type="application/json"]'
        ).innerHTML
      );
      this.details = { ...details1, ...details2 };
      if (this.details) {
        return this.details;
      } else {
        throw new Error("No IMDb details found.");
      }
    } catch (error) {
      return error;
    }
  }
}
