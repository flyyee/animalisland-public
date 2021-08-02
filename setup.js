const express = require('express')
const path = require('path')
const fetch = require('node-fetch');
var sharp = require("sharp")
var glob = require("glob")
var fs = require('fs'),
    request = require('request');
const _connstring = require('./credentials')
const { MongoClient } = require('mongodb')
const app = express()
const port = 11990

let mongoClient // global mongo client variable
mongoClient = new MongoClient(_connstring, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
mongoClient.connect().then(res => local_setup())

function download_img(uri, filename, callback) {
    request.head(uri, function (err, res, body) {
        // console.log('content-type:', res.headers['content-type']);
        // console.log('content-length:', res.headers['content-length']);
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

function local_setup() {
    const database = mongoClient.db('animalisland');
    const cardsdb = database.collection('cards');
    cardsdb.findOne({ id: 0 }).then(
        res => {
            let cards = res.cards
            let finishedCards = 0
            for (let card of cards) {
                console.log(card.name)
                const local_files = glob.sync(`./public/${card.name}.*`)
                if (local_files.length == 0) {
                    let ext = card.imgsrc.split(".").pop()
                    if (ext.indexOf("?") != -1) {
                        ext = ext.substr(0, ext.indexOf("?"))
                    }
                    let correct_extensions = ["tif", "tiff", "gif", "jpg", "jpeg", "png"]
                    if (!correct_extensions.includes(ext)) {
                        ext = "jpg"
                    }
                    download_img(card.imgsrc, `./unedited/${card.name}.${ext}`, (res => {
                        sharp(`./unedited/${card.name}.${ext}`)
                            .resize(200, 200, { fit: "fill" })
                            .toFile(`./public/${card.name}.${ext}`, function (err) {
                                finishedCards += 1
                                if (err != null) {
                                    console.log(card.name, err)
                                }
                            });
                    }))
                } else {
                    finishedCards += 1
                }
            }
            let checker = setInterval(() => {
                if (finishedCards == cards.length) {
                    clearInterval(checker)
                    console.log("All files done. Updating db now.")
                    for (let card of cards) {
                        let ext = card.imgsrc.split(".").pop()
                        if (ext.indexOf("?") != -1) {
                            ext = ext.substr(0, ext.indexOf("?"))
                        }
                        let correct_extensions = ["tif", "tiff", "gif", "jpg", "jpeg", "png"]
                        if (!correct_extensions.includes(ext)) {
                            ext = "jpg"
                        }
                        card.imgsrcoriginal = card.imgsrc
                        card.imgsrc = `/${card.name}.${ext}`
                        // parse ints... sigh
                        card.type = parseInt(card.type)
                        card.cost = parseInt(card.cost)
                        card.benefit = parseInt(card.benefit)
                        card.turnsTill = parseInt(card.turnsTill)
                        card.replaceAfter = parseInt(card.replaceAfter)
                    }
                    cardsdb.updateOne({ id: 0 }, {
                        $set: { cards: cards }
                    }).then(res => {
                        console.log(res)
                    })
                }
            }, 1000)
        })
}

// local_setup()