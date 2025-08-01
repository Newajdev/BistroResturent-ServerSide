const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


// .......................................MongoDB Start.......................................................................

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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


        const menuCollection = client.db("bistroDB").collection("menu");
        const cartCollection = client.db("bistroDB").collection("carts");
        const userCollection = client.db("bistroDB").collection("users");
        const reviewCollection = client.db("bistroDB").collection("reviews");

        // ============================================== Custom Middlewares ===============================================
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCES_SECRET_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden access' })
                }
                req.decoded = decoded;
                next()

            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { Email: email }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.userPosition === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }
        // ============================================== Custom Middlewares ===============================================

        // ----------------------------------------------Jwt Start---------------------------------------------

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCES_SECRET_TOKEN, { expiresIn: '1h' });
            res.send({ token })
        })

        


        // ----------------------------------------------Jwt End-----------------------------------------------

        // ----------------------------------------------Menu Collection Start---------------------------------------------
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find(req.body).toArray()    
            res.send(result)
        })
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id:  new ObjectId(id)}
            const result = await menuCollection.findOne(query);   
            res.send(result)
        })
        app.post ('/menu', verifyToken, verifyAdmin, async(req, res)=>{
            const result = await menuCollection.insertOne(req.body)
            res.send(result)
        })
        app.delete ('/menu/:id', verifyToken, verifyAdmin, async(req, res)=>{

            const id = req.params.id;

            query = {_id: new ObjectId(id)};
            const result = await menuCollection.deleteOne(query)

            res.send(result)
            
        })

        app.patch('/menu/update/:id', verifyToken, verifyAdmin, async(req, res) =>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)}
            const update = {
                $set: {
                    name : req.body.name ,
                    recipe: req.body.recipe ,
                    image : req.body.image ,
                    category: req.body.category ,
                    price: req.body.price
                }
            }
            const result = await menuCollection.updateOne(filter, update)
            res.send(result);
        })

        // ----------------------------------------------Menu Collection End-----------------------------------------------


        // ----------------------------------------------user Collection Start---------------------------------------------
        

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })
        

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }

            const query = { Email: { $regex: `^${email}$` } };
            const user = await userCollection.findOne(query)
            const admin = user?.userPosition
            res.send({ admin });
        })


        app.post('/users', async (req, res) => {
            const userInfo = req.body

            const query = { Email: userInfo.Email }
            const exitingEmail = await userCollection.findOne(query)

            if (exitingEmail) {
                return res.send({ message: 'Email Aready Exists' })
            }

            const result = await userCollection.insertOne(userInfo)
            res.send(result);
        })
        app.patch('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }

            const updatePosition = {
                $set: {
                    userPosition: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatePosition)
            res.send(result)
        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })


        // ----------------------------------------------user Collection End-----------------------------------------------


        // ----------------------------------------------Cart Collection Start---------------------------------------------
        

        app.get('/carts', async (req, res) => {
            const result = await cartCollection.find(req.body).toArray()
            res.send(result)
        })


        app.get('/cart', async (req, res) => {
            const email = req.query.UserEmail;

            if (!email) {
                return res.status(400).send({ message: 'Email query is required' });
            }


            try {
                // Step 2: Find all cart items for the user
                const cartItems = await cartCollection.find({ UserEmail: email }).toArray();


                // Step 3: Extract all item ObjectIds from cart
                const itemIds = cartItems
                    .filter(item => ObjectId.isValid(item.Item))
                    .map(item => new ObjectId(item.Item));


                // Step 4: Get menu items using the IDs
                const menuItems = await menuCollection.find({ _id: { $in: itemIds } }).toArray();


                // Step 5: Merge quantity with menu item details
                const result = menuItems.map(menuItem => {
                    const matchingCartItem = cartItems.find(cartItem => cartItem.Item === menuItem._id.toString());
                    return {
                        ...menuItem,
                        quantity: matchingCartItem?.quantity || 1
                    };
                });

                res.send(result);
            } catch (error) {
                console.error('Error fetching cart items:', error);
                res.status(500).send({ message: 'Internal server error' });
            }


        })

        app.delete('/carts/:Item', async (req, res) => {
            const ItemId = req.params.Item;
            const query = { Item: ItemId }
            console.log(query);


            // const result = await cartCollection.find(query).toArray
            // const Item = req.params.id;
            // const filter = { Item: Item }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })

        app.post('/cart', async (req, res) => {
            const { UserEmail, Item } = req.body;
            const CheckItems = await cartCollection.findOne({ UserEmail, Item })
            if (CheckItems) {
                const update = await cartCollection.updateOne({ UserEmail, Item }, { $inc: { quantity: 1 } })
                return res.send(update)
            }

            const result = await cartCollection.insertOne({ UserEmail, Item, quantity: 1 })
            res.send(result)
        })
        // ----------------------------------------------Cart Collection End-----------------------------------------------


        // ----------------------------------------------Reviews Collection Start---------------------------------------------

        app.get('/reviews', async (req, res) => {
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