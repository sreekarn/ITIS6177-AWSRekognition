var cors = require('cors')
var express = require('express')
var multer = require('multer')
var AWS = require('aws-sdk')    
var fs = require('fs')
var path = require('path')
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const env = require("dotenv").config();

const port = process.env.port || 8081;

var app = express()
app.use(cors())

const options = {
    swaggerDefinition: {
        info: {
            title: 'AWS TEXT REKOGNITION API',
            version: '1.0.0',
            description: 'ITIS 6177 - AWS TEXT REKOGNITION -Detect Text'
        },
        host:'localhost:8081',
        basePath:'/'
    },
    apis:['app.js']
};

const specs = swaggerJsDoc(options);

app.use('/docs', swaggerUI.serve, swaggerUI.setup(specs));

var localFileName = "";
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/images/')
    },
    filename: function (req, file, cb) {
        localFileName = Date.now() + "-" + file.originalname
        cb(null, localFileName)
    }
});

var upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
            return callback(new Error('Please check the file format, it is not in image format that is jpeg,jpg or png'))
        }
        callback(null, true)
    }
})

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
})


function getFile(path) {
    try {
        const image = fs.readFileSync(path)
        return (image)
    }
    catch (e) {
        console.error(e.message)
        process.exit()
    }
}
const rekognition = new AWS.Rekognition();


/**
 * @swagger
 * /detectText:
 *   post:
 *     description: Call to GenerateText API using POST method which Returns the text of the image
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: The file to upload.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Response from AWS rekognition(text data)
 *       400:
 *         description: Empty file
 *       500:
 *         description: Only images are allowed
 */
app.post('/detectText', upload.any(), function (req, res) {
    if(localFileName.length == 0)
        res.status(400).send("The file cannot be empty");
    
    var params = {
        Image: {
            Bytes: getFile(`./images/${localFileName}`)
        }
    };
    
    rekognition.detectText(params, function (err, data) {
        if (err) console.log("err: ", err, err.stack);
        else {
            console.log("data: ", data);
            res.json(data);
        }
    });
});

/**
 * @swagger
 * /getOnlyText:
 *   post:
 *     description: Call to GenerateText API using POST method which Returns only the text of the image
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: image
 *         type: file
 *         required: true
 *         description: The file to upload.
 *     produces:
 *       - text/plain
 *     responses:
 *       200:
 *         description: Response from AWS rekognition(text data)
 *       400:
 *         description: Empty file
 *       500:
 *         description: Only images are allowed
 */
app.post('/getOnlyText', upload.any(), function (req, res) {
    if(localFileName.length == 0)
        res.status(400).send("The file cannot be empty");
    
    var params = {
        Image: {
            Bytes: getFile(`./images/${localFileName}`)
        }
    };
    
    rekognition.detectText(params, function (err, data) {
        var result = [];
        if (err) console.log("err: ", err, err.stack);
        else {
            if(data!=null){
                var topic=data.TextDetections;
                
                for(var i in topic){
                    result.push( topic[i]['DetectedText']);
                }
               
            }
            result = JSON.parse(JSON.stringify(result)); 
            result = result.toString();
            console.log("result: ", result);
            res.json(result);
        }
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});