// Set up our environmental variables, you'll need to add a
// .env file into your root directory in order for this to work!
require('dotenv/config')
const rp = require('request-promise')
var request = require('request');
const checksum = require('checksum');
const co = require('cheerio')
const config = require('config');
const send = require('./send')

console.log('🕵🏕 Initiating Camping-Patrol...')

function checkAvailability(startDate, numNights) {
  // rp(url)
  //   .then((HTMLresponse) => {
  //     const $ = co.load(HTMLresponse);
  //     let apartmentString = "";

  //     console.log($.text())

  //     // use cheerio to parse HTML response and find all search results
  //     // then find all apartmentlistingIDs and concatenate them 
  //     $(".search-item.regular-ad").each((i, element) => {
  //       apartmentString += `${element.attribs["data-ad-id"]}`;
  //     });

  //     return apartmentString
  //   }).catch(err => {
  //     console.log(`Could not complete fetch of ${url}: ${err}`)
  //   })

  var headers = {
      'authority': 'calirdr.usedirect.com',
      'sec-ch-ua': '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'sec-ch-ua-mobile': '?0',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36',
      'content-type': 'application/json',
      'origin': 'https://www.reservecalifornia.com',
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
      'referer': 'https://www.reservecalifornia.com/',
      'accept-language': 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7,pt-BR;q=0.6,pt;q=0.5'
  };
  
  //var dataString = '{"PlaceId":"714","Latitude":0,"Longitude":0,"HighlightedPlaceId":0,"StartDate":"03-19-2021","Nights":"7","CountNearby":true,"NearbyLimit":100,"NearbyOnlyAvailable":false,"NearbyCountLimit":10,"Sort":"Distance","CustomerId":"0","RefreshFavourites":true,"IsADA":false,"UnitCategoryId":"1015","SleepingUnitId":"74","MinVehicleLength":"20","UnitTypesGroupIds":["18"]}';
  var dataString = '{"PlaceId":"714","Latitude":0,"Longitude":0,"HighlightedPlaceId":0,"StartDate":"'+startDate+'","Nights":"'+numNights+'","CountNearby":true,"NearbyLimit":100,"NearbyOnlyAvailable":false,"NearbyCountLimit":10,"Sort":"Distance","CustomerId":"0","RefreshFavourites":true,"IsADA":false,"UnitCategoryId":"1015","SleepingUnitId":"74","MinVehicleLength":"20","UnitTypesGroupIds":["18"]}';
  

  var options = {
      url: 'https://calirdr.usedirect.com/rdr/rdr/search/place',
      method: 'POST',
      headers: headers,
      body: dataString
  };

  var whiteListOfIds = process.env.WHITE_LIST_IDs.split(',')
  
  function callback(error, response, body) {
      if (!error && response.statusCode == 200) {
          //console.log(body);
          const parsedResponse = JSON.parse(body)
          const listOfAvailableSpots = parsedResponse.NearbyPlaces.concat(parsedResponse.SelectedPlace)
          .filter(ele => 
            ele.Available
            && whiteListOfIds.includes(ele.PlaceId.toString())
            //&& ele.AvailableFiltered
          )
          .map(ele => {
            return '['+ele.PlaceId+']'+ele.Name
          })

          console.log(listOfAvailableSpots)
          if (listOfAvailableSpots.length == 0) {
            console.log("🙀 No Available Spots!")
          } else {
            console.log('Camping available at ' + listOfAvailableSpots + startDate + ' ' + numNights)
            const msg = buildMessage('Camping available at ' + listOfAvailableSpots + startDate + ' ' + numNights)
            if (!sentMessages[startDate + '_' + numNights]) {
              send.SMS(msg);
            }

            sentMessages[startDate + '_' + numNights] = true
            console.log(sentMessages)

          }
      }
  }
  
  request(options, callback);

}

function buildMessage(str) {
  return {
    to: process.env.NUMBER_TO_TEXT,
    from: process.env.TWILIO_NUMBER,
    body: str
  };
}

var sentMessages = {}

// This function will run inside our setInterval
function checkURL() {
  console.log(`🕵️  Checking for updates...`);
  const dates = process.env.START_DATES.split(',');
  const numDays = process.env.NUM_NIGHTS.split(',');

  dates.map(async (date, index) => {
    console.log(`Searching availability for ${date} with ${numDays[index]} days...`)
    await checkAvailability(date, numDays[index])
  });

}

// 600000ms = 10 minutes
checkURL();
setInterval(() => {
    checkURL();
}, process.env.CHECK_INTERVAL_MS || 600000);
