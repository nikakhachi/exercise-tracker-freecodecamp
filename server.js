const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

mongoose.connect(process.env.MONGO_PASS, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

const userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSchema]
})

let Exercise = mongoose.model('Exercise', exerciseSchema);
let User = mongoose.model('User', userSchema);

app.post(`/api/exercise/new-user`, bodyParser.urlencoded({ extended: false }), (req, res) => {
  User.findOne({username: req.body.username}, (err, data) => {
    if(!err && !data){
      let user = new User({username: req.body.username});
      user.save((err, data) => {
        if(err){
          console.log(err);
        }else{
          res.json({username: req.body.username, _id: data['_id']});
        }
      })
    }else if(err){
      console.log(err);
    }else{
      res.send(`Username is taken`)
    }
  })
});

app.get(`/api/exercise/users`, (req, res) => {
  User.find({}, (err, data) => {
    res.json(data);
  });
});

app.post(`/api/exercise/add`, bodyParser.urlencoded({extended: false}), (req, res) => {
  let newSession = new Exercise({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })

  if(newSession.date == ''){
    newSession.date = new Date();
  }

  User.findByIdAndUpdate(req.body.userId, {$push : {log: newSession}}, {new: true}, (err, data) => {
    if(!err){
      let resObject = {};
    resObject['_id'] = data['id'];
    resObject['username'] = data.username;
    resObject['date'] = new Date(newSession.date).toDateString();
    resObject['description'] = newSession.description;
    resObject['duration'] = newSession.duration;
    res.json(resObject);
    }else{
      console.log(err);
    }
  })
})

app.get('/api/exercise/log', (req, res) => {
  User.findById(req.query.userId, (err, data) => {
    if(!err){
      let responseObject = data;
      responseObject = responseObject.toJSON()
      responseObject['count'] = data.log.length

      if(req.query.from || req.query.to){
        let fromDate = new Date(0);
        let toDate = new Date();

        if(req.query.from){
          fromDate = new Date(req.query.from);
        }

        if(req.query.to){
          toDate = new Date(req.query.to);
        }

        fromDate = fromDate.getTime();
        toDate = toDate.getTime();

        responseObject.log = responseObject.log.filter(item => {
          let exerciseDate = new Date(item.date).getTime();
          return exerciseDate >= fromDate && exerciseDate <= toDate;
        });

      }

      if(req.query.limit){
        responseObject.log = responseObject.log.splice(0, req.query.limit);
      }

      res.json(responseObject)
    }else{
      console.log(err);
    }
  })
})