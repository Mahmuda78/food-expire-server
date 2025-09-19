const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.klnjmif.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
  
    await client.connect();


const foodsCollection = client.db('foodDB').collection('foods');
// get
app.get('/foods', async (req, res) => {
  try {
    const result = await foodsCollection.find()
      .sort({ expiryDate: 1 })
      .toArray();
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Unable to fetch foods' });
  }
});

// nearly-expiry
app.get('/nearly-expiry', async (req, res) => {
  try {
    const now = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(now.getDate() + 5);

   
    const allFoods = await foodsCollection.find().toArray();

    const nearlyExpiry = [];
    for (const food of allFoods) {
      const expDate = new Date(food.expiryDate); 
      if (expDate >= now && expDate <= fiveDaysLater) {
        nearlyExpiry.push(food);
      }
    }

    
    nearlyExpiry.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    res.send(nearlyExpiry.slice(0, 6));
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Unable to fetch nearly expiry foods' });
  }
});


app.get('/expired', async (req, res) => {
  try {
    const now = new Date();

    const allFoods = await foodsCollection.find().toArray();

    const expiredFoods = [];
    for (const food of allFoods) {
      const expDate = new Date(food.expiryDate);
      if (expDate < now) {  
        expiredFoods.push(food);
      }
    }

   
    expiredFoods.sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));

    res.send(expiredFoods);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Unable to fetch expired foods' });
  }
});




;








// post
app.post('/foods', async (req, res) => {
  const newFood = req.body;

  // convert expiryDate to Date object
  if (newFood.expiryDate) {
    newFood.expiryDate = new Date(newFood.expiryDate);
  }

  const result = await foodsCollection.insertOne(newFood);
  res.send(result);
});








    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res) => {
    res.send('Food expiry tracker is running')
})

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
    
})