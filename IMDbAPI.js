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

  // Public method to get title name
  async getTitle(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      return this.details.name;
    } else {
      return "Title not found";
    }
  }

  // Public method to get release year
  async getReleaseYear(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      return this.details.props.pageProps.aboveTheFoldData.releaseYear.year;
    } else {
      return "Title not found";
    }
  }

  // Private method to convert list to text
  _listToText(array) {
    return array.join(", ").replace(/,(?!.*,)/gim, " and");
  }

  // Private method to get people information (director, creator, etc.)
  async _getPeople(imdb_id, people_type, InList = false, name_id = false) {
    try {
      if (!this.details) {
        this.details = await this._getDetails(imdb_id);
      }
      const People = [];
      this.details[people_type].forEach((person) => {
        if (Object.keys(person).includes("name")) {
          if (name_id) {
            People.push({
              [people_type]: person.name,
              id: person.url.substring(6, person.url.length - 1),
            });
          } else {
            People.push(person.name);
          }
        }
      });
      if (InList || name_id) {
        return People;
      } else {
        return this._listToText(People);
      }
    } catch (error) {
      if (InList) {
        return [];
      } else {
        return error;
      }
    }
  }

  // Public method to get directors
  async getDirector(search, InList = false, name_id = false) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      return this._getPeople(imdb_id, "director", InList, name_id);
    } else {
      return "Title not found";
    }
  }

  // Public method to get creators
  async getCreator(search, InList = false, name_id = false) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      return this._getPeople(imdb_id, "creator", InList, name_id);
    } else {
      return "Title not found";
    }
  }

  // Public method to get main actors
  async getMainActors(search, InList = true, name_id = false) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      return this._getPeople(imdb_id, "actor", InList, name_id);
    } else {
      return "Title not found";
    }
  }

  // Private method to get information (languages, countries, etc.)
  async _getInfo(imdb_id, info_type, InList = true) {
    let info_id;
    switch (info_type) {
      case "language":
        info_id = "title-details-languages";
        break;
      case "country":
        info_id = "title-details-origin";
        break;
      case "company":
        info_id = "title-details-companies";
        break;
      case "aka":
        info_id = "title-details-akas";
        break;
      case "filming_location":
        info_id = "title-details-filminglocations";
        break;
      default:
        console.log("Invalid argument in getInfo");
        return "";
    }

    let info = [];
    try {
      if (!this.sourceDOM) {
        this.sourceDOM = await this._getPage(`${this.url}/title/${imdb_id}`);
      }
      let elements = this.sourceDOM.window.document.querySelectorAll(
        `li[data-testid="${info_id}"] div[class="ipc-metadata-list-item__content-container"] a`
      );
      for (const element of elements) {
        info.push(element.textContent);
      }
      if (info.length === 0) {
        elements = this.sourceDOM.window.document.querySelectorAll(`
          li[data-testid="${info_id}"] div[class="ipc-metadata-list-item__content-container"] span`);
        for (const element of elements) {
          info.push(element.textContent);
        }
      }
      if (InList) {
        return info;
      } else {
        return this._listToText(info);
      }
    } catch (error) {
      if (InList) {
        return [];
      } else {
        return error;
      }
    }
  }

  // Public method to get countries
  async getCountries(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      return this._getInfo(imdb_id, "country");
    } else {
      return "Title not found";
    }
  }

  // Public method to get languages
  async getLanguages(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      return this._getInfo(imdb_id, "language");
    } else {
      return "Title not found";
    }
  }

  // Public method to get companies
  async getCompanies(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      return this._getInfo(imdb_id, "company");
    } else {
      return "Title not found";
    }
  }

  // Public method to get genres
  async getGenres(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      return this.details.genre;
    } else {
      return "Title not found";
    }
  }

  // Public method to get type (Movie or TV Series)
  async getType(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      return this.details["@type"];
    } else {
      return "Title not found";
    }
  }

  // Public method to get runtime
  async getRuntime(search, seconds = false) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      if (seconds) {
        return this.details.props.pageProps.aboveTheFoldData.runtime.seconds;
      } else {
        let duration = this.details.duration.substring(
          2,
          this.details.duration.length - 1
        );
        if (!duration.includes("H")) {
          if (duration.length === 1) {
            duration = "0" + duration;
          }
          duration = "0h" + duration;
        } else {
          if (duration.length === 3) {
            duration = duration.replace("H", "h0");
          } else {
            duration = duration.replace("H", "h");
          }
        }
        return duration;
      }
    } else {
      return "Title not found";
    }
  }

  // Public method to get release date
  async getReleaseDate(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      if (this.details.datePublished) {
        return this.details.datePublished;
      } else {
        const release_date =
          this.details.props.pageProps.aboveTheFoldData.releaseDate;
        let date = release_date.year.toString();
        if (release_date.month) {
          let month = release_date.month.toString();
          if (month.length === 1) {
            month = "0" + month;
          }
          date += `-${month}`;
          if (release_date.day) {
            let day = release_date.day.toString();
            if (day.length === 1) {
              day = "0" + day;
            }
            date += `-${day}`;
          }
        }
        return date;
      }
    } else {
      return "Title not found";
    }
  }

  // Public method to get description
  async getDescription(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      return this.details.description;
    } else {
      return "Title not found";
    }
  }

  // Public method to get content rating
  async getContentRating(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      return this.details.contentRating;
    } else {
      return "Title not found";
    }
  }

  // Public method to get rating
  async getRating(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      return this.details.aggregateRating.ratingValue;
    } else {
      return "Title not found";
    }
  }

  // Public method to get poster URL
  async getPosterURL(search) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      this.details = await this._getDetails(imdb_id);
      return this.details.image;
    } else {
      return "Title not found";
    }
  }

  // Public method to get cast
  async getCast(search, limit = 15, uncredited = false, all = false, name_id = false) {
    const imdb_id = await this._getIdFromSearch(search);
    if (imdb_id) {
      try {
        const sourceActorsDOM = await this._getPage(
          this.url + "/title/" + imdb_id + "/fullcredits"
        );
        let cast_list = [];
        let full_cast;
        if (sourceActorsDOM) {
          full_cast = sourceActorsDOM.window.document.querySelector(
            'table[class="cast_list"]'
          );
        }
        if (full_cast) {
          let counter = 0;
          for (const actor of [
            ...full_cast.querySelectorAll("tr").values(),
          ].slice(1)) {
            let row_number = 0;
            let cast = {};
            for (const row of [...actor.querySelectorAll("td").values()]) {
              if (row_number == 1) {
                cast["actor"] = row
                  .querySelector("a")
                  .text.replace(/[\t\r\n]/, "")
                  .trim();
                cast["url"] = row.querySelector("a").href;
                const sourceDOM = await this._getPage(this.url + cast["url"]);
                const imageURL = JSON.parse(
                  sourceDOM.window.document.querySelector(
                    'script[type="application/ld+json"]'
                  ).innerHTML
                ).image;
                cast["image_url"] = imageURL;
              }
              if (row_number == 3) {
                let character = row
                  .querySelector("a")
                  .text.replace(/[\t\r\n]/, "")
                  .trim();
                character = character.replace(/ +/, " ");
                if (character.includes("uncredited") && !uncredited) {
                  continue;
                }
                cast["character"] = character;
                cast_list.push(cast);
                counter += 1;
              }
              if (name_id) {
                if (row_number == 0 && row.a != null) {
                  cast["id"] = row.a["href"].substring(
                    6,
                    row.a["href"].length - 1
                  );
                }
              }
              row_number += 1;
            }
            if (counter == limit && !all) {
              break;
            }
          }
        } else {
          throw new Error("No actors found.");
        }
        return cast_list;
      } catch (error) {
        return error;
      }
    } else {
      return "Title not found";
    }
  }
}
