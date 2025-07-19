const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


// .......................................MongoDB Start.......................................................................

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_PASS}@cluster0.x1smjlm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // ----------------------------------------------Menu Collection Start---------------------------------------------
        const menuCollection = client.db("bistroDB").collection("menu");

        app.get('/menu', async(req, res)=>{
            const result = await menuCollection.find(req.body).toArray()
            res.send(result)
        })
        // ----------------------------------------------Menu Collection End-----------------------------------------------

        // ----------------------------------------------Reviews Collection Start---------------------------------------------
        const reviewCollection = client.db("bistroDB").collection("reviews");

        app.get('/reviews', async(req, res)=>{
            const result = await reviewCollection.find(req.body).toArray()
            res.send(result)
        })
        // ----------------------------------------------Menu Collection End-----------------------------------------------

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// .......................................MongoDB End.........................................................................
app.get('/', (req, res) => {
    res.send('bistro server running')
})

app.listen(port, () => {
    console.log(`bistro server running on port ${port}`);
})