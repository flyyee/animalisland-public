const express = require('express')
const path = require('path')
const fetch = require('node-fetch');
const fs = require('fs');
var Glob = require("glob").Glob
const _connstring = require('./credentials')
const { MongoClient } = require('mongodb')
const app = express()

let port = process.env.PORT;
if (port == null || port == "") {
    port = 11990;
}

let mongoClient // global mongo client variable
mongoClient = new MongoClient(_connstring, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
mongoClient.connect()

app.use(express.static("public"))
app.use(express.json());

// app.get('/', (req, res) => {
//     res.send('Hello World!')
// })

app.post('/api/setup', (req, res) => {
    // console.log(req.body)
    const database = mongoClient.db('animalisland');
    const cardsdb = database.collection('cards');
    cardsdb.findOne({ id: 0 }).then(
        res => {
            let cards = res.cards
            let turninfo = ""
            if (req.body.type == 1) {
                turninfo = `Gain: ${req.body.benefit}, Loss: ${req.body.cost}`
            } else if (req.body.type == 2) {
                turninfo = `Gain: ${req.body.benefit} (in ${req.body.turnsTill} turns), Loss: ${req.body.cost}`
            } else if (req.body.type == 3) {
                turninfo = `Gain: ${req.body.benefit}, Loss: ${req.body.cost} (in ${req.body.turnsTill} turns)`
            } else if (req.body.type == 4) {
                turninfo = `Gain: ${req.body.benefit} (for ${req.body.turnsTill} turns), Loss: ${req.body.cost}`
            } else if (req.body.type == 5) {
                turninfo = `Gain: ${req.body.benefit}, Loss: ${req.body.cost} (for ${req.body.turnsTill} turns)`
            }
            cards.push({
                name: req.body.name.toLowerCase(),
                imgsrc: req.body.imgsrc,
                info: req.body.bio,
                type: parseInt(req.body.type),
                cost: parseInt(req.body.cost),
                benefit: parseInt(req.body.benefit),
                turnsTill: parseInt(req.body.turnsTill),
                turnsTill2: 0,
                replaceAfter: parseInt(req.body.replaceAfter),
                turninfo: turninfo,
                color: req.body.color
            })
            cardsdb.updateOne({ id: 0 }, { "$set": { cards: cards } }, {})
                .then(res => console.log(res))
        }
    )
    res.send('Hello World!')
})



app.get('/org', (req, res) => {
    if (req.query.nousername && req.query.nousername == 1) {
        res.sendFile(path.join(__dirname, '/home_nousername.html'))
    } else if (req.query.full && req.query.full == 1) {
        res.sendFile(path.join(__dirname, '/home_full.html'))
    } else {
        res.sendFile(path.join(__dirname, '/home.html'))
    }
})

app.get(
    ['/org/room1', '/org/room2', '/org/room3', '/org/room4', '/org/room5'],
    (req, res) => {
        let roomNumber = req.path.slice(-1) // string
        res.sendFile(path.join(__dirname, '/room_nice.html'))
    }
)

app.get(
    ['/password/admin/room1', '/password/admin/room2', '/password/admin/room3', '/password/admin/room4', '/password/admin/room5'],
    (req, res) => {
        let roomNumber = req.path.slice(-1) // string
        res.sendFile(path.join(__dirname, '/admin_room.html'))
    }
)
app.get("/password/admin", (req, res) => {
    let roomNumber = req.path.slice(-1) // string
    res.sendFile(path.join(__dirname, '/admin.html'))
}
)

app.get("/setup", (req, res) => {
    let roomNumber = req.path.slice(-1) // string
    res.sendFile(path.join(__dirname, '/setup.html'))
}
)

app.get('/create', (req, res) => {
    const database = mongoClient.db('animalisland');
    const org = database.collection('org');
    org.insertOne({
        roomNumber: "2",
        maxCapacity: 5,
        currentCapacity: 0,
        currentUsers: [],
        gameState: {
            info: "nth for now"
        }
    }).then(res => console.log(res))
    org.insertOne({
        roomNumber: "3",
        maxCapacity: 5,
        currentCapacity: 0,
        currentUsers: [],
        gameState: {
            info: "nth for now"
        }
    }).then(res => console.log(res))
    org.insertOne({
        roomNumber: "4",
        maxCapacity: 5,
        currentCapacity: 0,
        currentUsers: [],
        gameState: {
            info: "nth for now"
        }
    }).then(res => console.log(res))
    org.insertOne({
        roomNumber: "5",
        maxCapacity: 5,
        currentCapacity: 0,
        currentUsers: [],
        gameState: {
            info: "nth for now"
        }
    }).then(res => console.log(res))
    res.send("ok?")
})

app.get('/api/join_room', (req, res) => {
    // console.log("here")
    if (req.query.username && req.query.id && req.query.roomNumber) {
        // console.log("here")
        const database = mongoClient.db('animalisland')
        const org = database.collection('org')
        org.findOne({ roomNumber: req.query.roomNumber }).then(
            room => {
                let newuser = true
                for (let user of room.currentUsers) {
                    if (user.id == req.query.id) {
                        newuser = false
                        break
                    }
                }
                if (newuser) {
                    org
                        .updateOne(
                            {
                                roomNumber: req.query.roomNumber,
                                currentCapacity: { $lt: 5 }
                            },
                            {
                                $addToSet: {
                                    currentUsers: {
                                        id: req.query.id,
                                        username: req.query.username
                                    }
                                },
                                // $inc: {
                                //     currentCapacity: 1
                                // }
                            },
                            {}
                        )
                        .then(res => {
                            if (res.modifiedCount == 1) { // successfully added so change number of users in room
                                org
                                    .updateOne(
                                        {
                                            roomNumber: req.query.roomNumber,
                                        },
                                        {
                                            $inc: {
                                                currentCapacity: 1
                                            }
                                        },
                                        {}
                                    )
                            }
                        })
                }
            }
        )
    }
    res.send('ok?')
})

app.get('/api/kick', (req, res) => {
    if (req.query.username && req.query.id && req.query.roomNumber) {
        // console.log("here")
        const database = mongoClient.db('animalisland')
        const org = database.collection('org')
        org.findOne({ roomNumber: req.query.roomNumber }).then(
            res => {
                let cUsers = res.currentUsers
                let found = false
                for (let x = 0; x < cUsers.length; x++) {
                    let user = cUsers[x]
                    if (user.id == req.query.id) {
                        cUsers.splice(x, 1)
                        found = true
                        break
                    }
                }
                let gs = res.gameState
                for (let x = 0; x < gs.users.length; x++) {
                    let user = gs.users[x]
                    if (user.id == req.query.id) {
                        gs.users.splice(x, 1)
                        break
                    }
                }
                let newUsers = res.currentCapacity
                if (found) {
                    newUsers -= 1
                }
                org.updateOne({
                    roomNumber: req.query.roomNumber,
                }, {
                    $set: {
                        currentCapacity: newUsers,
                        currentUsers: cUsers,
                        gameState: gs
                    }
                })
            }
        )
    }
    res.send('ok?')
})

app.get('/password/admin/kick', (req, res) => {
    if (req.query.username && req.query.id && req.query.roomNumber) {
        // console.log("here")
        const database = mongoClient.db('animalisland')
        const org = database.collection('org')
        org.findOne({ roomNumber: req.query.roomNumber }).then(
            res => {
                let cUsers = res.currentUsers
                let found = false
                for (let x = 0; x < cUsers.length; x++) {
                    let user = cUsers[x]
                    if (user.id == req.query.id) {
                        cUsers.splice(x, 1)
                        found = true
                        break
                    }
                }
                let gs = res.gameState
                for (let x = 0; x < gs.users.length; x++) {
                    let user = gs.users[x]
                    if (user.id == req.query.id) {
                        gs.users.splice(x, 1)
                        break
                    }
                }
                let newUsers = res.currentCapacity
                if (found) {
                    newUsers -= 1
                }
                org.updateOne({
                    roomNumber: req.query.roomNumber,
                }, {
                    $set: {
                        currentCapacity: newUsers,
                        currentUsers: cUsers,
                        gameState: gs
                    }
                })
            }
        )
    }
    res.send('ok?')
})

function checkTurns(obj, list) {
    let i
    for (i = 0; i < list.length; i++) {
        if (list[i].id === obj.id) {
            return i;
        }
    }

    return -1;
}

function roundOverCalc(roomNumber) { // for calculations to be done when the round is over
    const database = mongoClient.db('animalisland')
    const org = database.collection('org')
    const cardsdb = database.collection('cards')
    org.findOne({ roomNumber: roomNumber }).then(
        res => {
            cardsdb.findOne({ id: 0 }).then(
                res2 => {
                    let gs = res.gameState

                    let allCards = res2.cards
                    let dealtCards = []
                    for (let x = 0; x < gs.users.length + 1; x++) {
                        dealtCards.push(allCards[getRandomInt(allCards.length)])
                        dealtCards[x].active = 1
                    }
                    // console.log(dealtCards)

                    for (let user of gs.users) {
                        for (let card of user.cards) {
                            // console.log(card)
                            if (card.replaceAfter) {
                                card.replaceAfter = Math.max(0, card.replaceAfter - 1)
                            }
                            if (card.type == 1) {
                                if (card.turnsTill == 0) {
                                    // console.log("here")
                                    user.points += card.benefit - card.cost
                                    card.turnsTill = "-"
                                }
                            } else if (card.type == 2) {
                                if (card.turnsTill2 == 0) {
                                    card.turnsTill2 = "-"
                                    user.points -= card.cost
                                }
                                if (card.turnsTill == 0) {
                                    card.turnsTill = "-"
                                    user.points += card.benefit
                                } else if (card.turnsTill != "-") {
                                    card.turnsTill -= 1
                                }
                            } else if (card.type == 3) {
                                if (card.turnsTill2 == 0) {
                                    card.turnsTill2 = "-"
                                    user.points += card.benefit
                                }
                                if (card.turnsTill == 0) {
                                    card.turnsTill = "-"
                                    user.points -= card.cost
                                } else if (card.turnsTill != "-") {
                                    card.turnsTill -= 1
                                }
                            } else if (card.type == 4) {
                                if (card.turnsTill2 == 0) {
                                    card.turnsTill2 = "-"
                                    user.points -= card.cost
                                }
                                if (card.turnsTill != "-" && card.turnsTill > 0) {
                                    // card.turnsTill = "-"
                                    user.points += card.benefit
                                    card.turnsTill -= 1
                                } else {
                                    card.turnsTill = "-"
                                }
                            } else if (card.type == 5) {
                                if (card.turnsTill2 == 0) {
                                    card.turnsTill2 = "-"
                                    user.points += card.benefit
                                }
                                if (card.turnsTill != "-" && card.turnsTill > 0) {
                                    // card.turnsTill = "-"
                                    user.points -= card.cost
                                    card.turnsTill -= 1
                                } else {
                                    card.turnsTill = "-"
                                }
                            }
                        }
                        // user.points += 3
                    }
                    let firstuser = gs.users[getRandomInt(gs.users.length)]
                    gs.turns = [firstuser]
                    gs.dealtcards = dealtCards
                    org.updateOne({ roomNumber: roomNumber }, {
                        $set: {
                            gameState: gs
                        }
                    })
                })
        }
    )
}

app.get('/api/pass', (req, res) => {
    // console.log("here")
    if (req.query.username && req.query.id && req.query.roomNumber) {
        // console.log("here")
        const database = mongoClient.db('animalisland')
        const org = database.collection('org')
        org.findOne({ roomNumber: req.query.roomNumber }).then(
            res => {
                let gs = JSON.parse(JSON.stringify(res.gameState));
                let userlist = res.gameState.users
                let turns = res.gameState.turns
                let canskip = (req.query.bypass && req.query.bypass == 1 ? true : false)
                if (turns[turns.length - 1].id == req.query.id || canskip) {
                    // TODO: user has rights to pass
                    // console.log("i have rights")

                    if (turns.length >= userlist.length) {
                        // console.log("round over")
                        roundOverCalc(req.query.roomNumber)
                    } else {
                        // console.log("round not over")
                        for (let turn of turns) {
                            let idx = checkTurns(turn, userlist)
                            if (idx != -1) {
                                userlist.splice(idx, 1)
                            }
                        }
                        turns.push(userlist[getRandomInt(userlist.length)])

                        gs.turns = turns
                        // console.log(gs.users)
                        org
                            .updateOne(
                                {
                                    roomNumber: req.query.roomNumber,
                                },
                                {
                                    $set: {
                                        gameState: gs
                                    }
                                },
                                {}
                            )
                        // .then(res => console.log(res.modifiedCount))
                    }
                }
            }
        )
    }
    res.send('ok?')
})

app.get('/api/take', (req, rres) => {
    let res_value = {
        success: 0
    }
    // console.log("here")
    if (req.query.username && req.query.id && req.query.roomNumber && req.query.targetCard) {
        // console.log("here")
        const database = mongoClient.db('animalisland')
        const org = database.collection('org')
        org.findOne({ roomNumber: req.query.roomNumber }).then(
            async res => {
                let gs = JSON.parse(JSON.stringify(res.gameState));
                let userlist = res.gameState.users
                let turns = res.gameState.turns
                if (turns[turns.length - 1].id == req.query.id) {
                    // user has rights to pass
                    // console.log("i have rights")
                }
                // take card
                let myuser
                let myuseridx
                for (let x = 0; x < gs.users.length; x++) {
                    if (gs.users[x].username == req.query.username) {
                        myuser = gs.users[x]
                        myuseridx = x
                        break
                    }
                }
                if (myuser.cards.length > 4) {
                    res_value.success = 0
                } else {
                    // hand is not full
                    // console.log(gs.dealtcards)
                    // console.log(req.query.targetCard)
                    gs.dealtcards[req.query.targetCard].active = 0
                    gs.users[myuseridx].cards.push(gs.dealtcards[req.query.targetCard])
                    res_value.success = 1
                }

                await org
                    .updateOne(
                        {
                            roomNumber: req.query.roomNumber,
                        },
                        {
                            $set: {
                                gameState: gs
                            }
                        },
                        {}
                    )
                // .then(res => console.log(res.modifiedCount))


                if (turns.length >= userlist.length) {
                    // TODO: round is over
                    // console.log("round over")
                    roundOverCalc(req.query.roomNumber)
                } else {
                    // console.log("round not over")
                    for (let turn of turns) {
                        let idx = checkTurns(turn, userlist)
                        if (idx != -1) {
                            userlist.splice(idx, 1)
                        }
                    }
                    turns.push(userlist[getRandomInt(userlist.length)])

                    gs.turns = turns
                    // console.log(gs.users)
                    org
                        .updateOne(
                            {
                                roomNumber: req.query.roomNumber,
                            },
                            {
                                $set: {
                                    gameState: gs
                                }
                            },
                            {}
                        )
                    // .then(res => console.log(res.modifiedCount))
                }
                rres.json(res_value)
            }
        )
    }
    // res.json(res_value)
})

app.get('/api/discard', (req, rres) => {
    let res_value = {
        success: 0
    }
    if (req.query.username && req.query.id && req.query.roomNumber && req.query.targetCard) {
        const database = mongoClient.db('animalisland')
        const org = database.collection('org')
        org.findOne({ roomNumber: req.query.roomNumber }).then(
            async res => {
                let gs = JSON.parse(JSON.stringify(res.gameState));
                let userlist = res.gameState.users
                let turns = res.gameState.turns
                if (turns[turns.length - 1].id == req.query.id) {
                    // user has rights to play
                    // console.log("i have rights")
                }
                // discard card
                let myuser
                let myuseridx
                for (let x = 0; x < gs.users.length; x++) {
                    if (gs.users[x].username == req.query.username) {
                        myuser = gs.users[x]
                        myuseridx = x
                        break
                    }
                }

                // gs.dealtcards[req.query.targetCard].active = 0
                gs.users[myuseridx].cards.splice(req.query.targetCard, 1)
                res_value.success = 1

                await org
                    .updateOne(
                        {
                            roomNumber: req.query.roomNumber,
                        },
                        {
                            $set: {
                                gameState: gs
                            }
                        },
                        {}
                    )
                // .then(res => console.log(res.modifiedCount))

                if (turns.length >= userlist.length) {
                    // TODO: round is over
                    // console.log("round over")
                    roundOverCalc(req.query.roomNumber)
                } else {
                    // console.log("round not over")
                    for (let turn of turns) {
                        let idx = checkTurns(turn, userlist)
                        if (idx != -1) {
                            userlist.splice(idx, 1)
                        }
                    }
                    turns.push(userlist[getRandomInt(userlist.length)])
                    gs.turns = turns
                    org
                        .updateOne(
                            {
                                roomNumber: req.query.roomNumber,
                            },
                            {
                                $set: {
                                    gameState: gs
                                }
                            },
                            {}
                        )
                    // .then(res => console.log(res.modifiedCount))
                }
                rres.json(res_value)
            }
        )
    }
    // res.json(res_value)
})

app.get('/api/exchange', (req, rres) => {
    let res_value = {
        success: 0
    }
    if (req.query.username && req.query.id && req.query.roomNumber && req.query.targetCard && req.query.wantedCard) {
        const database = mongoClient.db('animalisland')
        const org = database.collection('org')
        org.findOne({ roomNumber: req.query.roomNumber }).then(
            async res => {
                let gs = JSON.parse(JSON.stringify(res.gameState));
                let userlist = res.gameState.users
                let turns = res.gameState.turns
                if (turns[turns.length - 1].id == req.query.id) {
                    // user has rights to play
                    // console.log("i have rights")
                }
                let myuser
                let myuseridx
                for (let x = 0; x < gs.users.length; x++) {
                    if (gs.users[x].username == req.query.username) {
                        myuser = gs.users[x]
                        myuseridx = x
                        break
                    }
                }
                // exchange procedure
                gs.users[myuseridx].cards.splice(req.query.targetCard, 1)
                gs.dealtcards[req.query.wantedCard].active = 0
                gs.users[myuseridx].cards.push(gs.dealtcards[req.query.wantedCard])
                res_value.success = 1

                await org
                    .updateOne(
                        {
                            roomNumber: req.query.roomNumber,
                        },
                        {
                            $set: {
                                gameState: gs
                            }
                        },
                        {}
                    )
                // .then(res => console.log(res.modifiedCount))

                if (turns.length >= userlist.length) {
                    // TODO: round is over
                    // console.log("round over")
                    roundOverCalc(req.query.roomNumber)
                } else {
                    // console.log("round not over")
                    for (let turn of turns) {
                        let idx = checkTurns(turn, userlist)
                        if (idx != -1) {
                            userlist.splice(idx, 1)
                        }
                    }
                    turns.push(userlist[getRandomInt(userlist.length)])
                    gs.turns = turns
                    org
                        .updateOne(
                            {
                                roomNumber: req.query.roomNumber,
                            },
                            {
                                $set: {
                                    gameState: gs
                                }
                            },
                            {}
                        )
                    // .then(res => console.log(res.modifiedCount))
                }
                rres.json(res_value)
            }
        )
    }
    // res.json(res_value)
})

function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

app.get(['/api/poll_room1', '/api/poll_room2', '/api/poll_room3', '/api/poll_room4', '/api/poll_room5'], (req, res) => {
    let roomNumber = req.path.slice(-1)
    const database = mongoClient.db('animalisland')
    const org = database.collection('org')
    org.findOne({ roomNumber: roomNumber }).then(
        gs => {
            // console.log(gs)
            if (gs) {
                res.json({
                    success: 1,
                    gameState: gs.gameState
                })
            } else {
                res.json({ success: 0 })
            }
        }
    )
    // res.send('ok?')
})

app.get(['/api/fullpoll_room1', '/api/fullpoll_room2', '/api/fullpoll_room3', '/api/fullpoll_room4', '/api/fullpoll_room5'], (req, res) => {
    let roomNumber = req.path.slice(-1)
    const database = mongoClient.db('animalisland')
    const org = database.collection('org')
    org.findOne({ roomNumber: roomNumber }).then(
        gs => {
            // console.log(gs)
            if (gs) {
                res.json({
                    success: 1,
                    room: gs
                })
            } else {
                res.json({ success: 0 })
            }
        }
    )
    // res.send('ok?')
})

app.get(['/password/admin/start_room1', '/password/admin/start_room2', '/password/admin/start_room3', '/password/admin/start_room4', '/password/admin/start_room5'], (req, res) => {
    let roomNumber = req.path.slice(-1)
    const database = mongoClient.db('animalisland')
    const org = database.collection('org')
    const cardsdb = database.collection('cards')
    // console.log(roomNumber)
    org.findOne({ roomNumber: roomNumber }).then(
        res => {
            let users = res.currentUsers
            // console.log(users)
            for (let x = 0; x < users.length; x++) {
                users[x].cards = []
                users[x].points = 0
            }
            let firstuser = users[getRandomInt(users.length)]
            cardsdb.findOne({ id: 0 }).then(
                res => {
                    let allCards = res.cards
                    // console.log(allCards)
                    let dealtCards = []
                    for (let x = 0; x < users.length + 1; x++) {
                        // console.log("here")
                        dealtCards.push(allCards[getRandomInt(allCards.length)])
                        dealtCards[x].active = 1
                    }
                    // console.log(dealtCards)
                    org.updateOne(
                        {
                            roomNumber: roomNumber,
                            currentCapacity: { $lt: 6 }
                        },
                        {
                            $set: {
                                gameState: {
                                    status: "started",
                                    dealtcards: dealtCards,
                                    users: users,
                                    turns: [firstuser]
                                }
                            }
                        },
                        {}
                    )
                }
            )
        }
    )
    res.send('ok?')
})

app.get(['/password/admin/end_room1', '/password/admin/end_room2', '/password/admin/end_room3', '/password/admin/end_room4', '/password/admin/end_room5'], (req, res) => {
    let roomNumber = req.path.slice(-1)
    const database = mongoClient.db('animalisland')
    const org = database.collection('org')
    const cardsdb = database.collection('cards')
    // console.log(roomNumber)
    org.findOne({ roomNumber: roomNumber }).then(
        res => {
            let users = res.gameState.users
            let endstate = []
            for (let x = 0; x < users.length; x++) {
                endstate.push({
                    user: users[x].username,
                    points: users[x].points
                })
            }
            endstate.sort((a, b) => (a.points < b.points ? 1 : -1))
            org.updateOne(
                {
                    roomNumber: roomNumber,
                    currentCapacity: { $lt: 6 }
                },
                {
                    $set: {
                        currentCapacity: 0,
                        currentUsers: [],
                        gameState: {
                            status: "ended",
                            endstate: endstate,
                            dealtcards: [],
                            users: [],
                            turns: []
                        }
                    }
                },
                {}
            )
        }
    )
    res.send('ok?')
})

app.get(['/password/admin/pass_room1', '/password/admin/pass_room2', '/password/admin/pass_room3', '/password/admin/pass_room4', '/password/admin/pass_room5'], (req, res) => {
    let roomNumber = req.path.slice(-1)
    // console.log(req.protocol + '://' + req.get('host') + "/api/pass?")
    const options = {
        hostname: req.protocol + '://' + req.get('host'),
        path: `/api/pass?username=a&id=a&roomNumber=${roomNumber}&bypass=1`,
        method: 'GET'
    }
    fetch(req.protocol + '://' + req.get('host') + `/api/pass?username=a&id=a&roomNumber=${roomNumber}&bypass=1`)
    // .then(res => console.log(res))
    res.send('ok?')
})

app.get(['/password/admin/restart_room1', '/password/admin/restart_room2', '/password/admin/restart_room3', '/password/admin/restart_room4', '/password/admin/restart_room5'], (req, res) => {
    let roomNumber = req.path.slice(-1)
    const database = mongoClient.db('animalisland')
    const org = database.collection('org')
    const cardsdb = database.collection('cards')
    org.findOne({ roomNumber: roomNumber }).then(fnd => {
        if (fnd) {
            if (fnd.gameState.status == "ended") {
                org.updateOne(
                    {
                        roomNumber: roomNumber,
                        currentCapacity: { $lt: 6 },
                    },
                    {
                        $set: {
                            currentCapacity: 0,
                            currentUsers: [],
                            gameState: {
                                status: "restarted",
                                dealtcards: [],
                                users: [],
                                turns: []
                            }
                        }
                    },
                    {}
                )
            }
        }
    })
    res.send('ok?')
})

// app.get('/api/setup_cards', async (req, res) => {
//         const database = mongoClient.db('animalisland');
//         const cards = database.collection('cards');
//         await cards.insertOne({
//             id: 0,
//             cards: []
//         }).then(res => {
//             console.log(res)
//         })

//         // cards.count({}, {}).then(
//         //     res => {
//         //         let numberOfCards = res

//         //         await cards.updateOne({id: 0}, {
//         //             cards: {
//         //                 "$addToSet": {

//         //                 }
//         //             }
//         //         }, {})
//         //     }
//         // )
//     res.send("ok?")
// })

app.get('/api/add_card', async (req, res) => {
    const database = mongoClient.db('animalisland');
    const cardsdb = database.collection('cards');
    await cardsdb.findOne({ id: 0 }).then(
        res => {
            let cards = res.cards
            cards.push({
                name: "bird",
                imgsrc: "https://1.img-dpreview.com/files/p/TS250x250~sample_galleries/1330372094/1693761761.jpg",
                info: "A cool animal that loves",
                type: 1,
                cost: 5,
                benefit: 6,
                turnsTill: 0,
                turnsTill2: 0,
                replaceAfter: 1,
                turninfo: "Gain: 6, Loss: 5",
                color: "red"
            })
            cards.push({
                name: "dog",
                imgsrc: "https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/cute-baby-animals-1558535060.jpg",
                info: "weird dog",
                type: 2,
                cost: 3,
                benefit: 4,
                turnsTill: 3,
                turnsTill2: 0,
                replaceAfter: 0,
                turninfo: "Gain: 4 (in 3 turns), Loss: 3",
                color: "blue"
            })
            cards.push({
                name: "cat",
                imgsrc: "https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/cute-baby-animals-1558535060.jpg",
                info: "pump hog",
                type: 3,
                cost: 3,
                benefit: 4,
                turnsTill: 4,
                turnsTill2: 0,
                replaceAfter: 2,
                turninfo: "Gain: 4, Loss: 3 (after 4 turns)",
                color: "red"
            })
            cardsdb.updateOne({ id: 0 }, { "$set": { cards: cards } }, {})
            // .then(res => console.log(res))
        }
    )
    res.send("ok?")
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})