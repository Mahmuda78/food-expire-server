const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.klnjmif.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Ensure connection
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(" Successfully connected to MongoDB!");

    const foodsCollection = client.db('foodDB').collection('foods');

    // ===================== ROUTES ===================== //

    // Get all foods (sorted)
    app.get('/foods', async (req, res) => {
      try {
        const { search, category, page = 0, limit = 9 } = req.query;
        const query = {};

        if (search) {
          query.$or = [
            { foodTitle: { $regex: search, $options: 'i' } },
            { foodCategory: { $regex: search, $options: 'i' } }
          ];
        }

        if (category && category !== 'all') query.foodCategory = category;

        const result = await foodsCollection
          .find(query)
          .sort({ expiryDate: 1 })
          .skip(page * limit)
          .limit(parseInt(limit))
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Unable to fetch foods' });
      }
    });

    // Nearly expiry foods
    app.get('/nearly-expiry', async (req, res) => {
      try {
        const now = new Date();
        const fiveDaysLater = new Date();
        fiveDaysLater.setDate(now.getDate() + 5);

        const allFoods = await foodsCollection.find().toArray();
        const nearlyExpiry = allFoods.filter(food => {
          const expDate = new Date(food.expiryDate);
          return expDate >= now && expDate <= fiveDaysLater;
        });

        nearlyExpiry.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        res.send(nearlyExpiry.slice(0, 6));
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Unable to fetch nearly expiry foods' });
      }
    });

    // Expired foods
    app.get('/expired', async (req, res) => {
      try {
        const now = new Date();
        const allFoods = await foodsCollection.find().toArray();
        const expiredFoods = allFoods.filter(food => new Date(food.expiryDate) < now);
        expiredFoods.sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));
        res.send(expiredFoods);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Unable to fetch expired foods' });
      }
    });


    // Single food
    app.get('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });

    // Add new food
    app.post('/foods', async (req, res) => {
      const newFood = req.body;
      if (newFood.expiryDate) {
        newFood.expiryDate = new Date(newFood.expiryDate);
      }
      const result = await foodsCollection.insertOne(newFood);
      res.send(result);
    });

    // My items by email
    app.get("/my-items/:email", async (req, res) => {
      const email = req.params.email;
      const result = await foodsCollection.find({ userEmail: email }).toArray();
      res.send(result);
    });

    // Add notes
    app.post("/foods/:id/notes", async (req, res) => {
      const id = req.params.id;
      const { userEmail, text } = req.body;
      const result = await foodsCollection.findOneAndUpdate(
        { _id: new ObjectId(id), userEmail },
        { $push: { notes: { userEmail, text, postedAt: new Date() } } },
        { returnDocument: "after" }
      );
      res.send(result);
    });

    // Update food
    app.put('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const updatedFood = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedFood };
      const result = await foodsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete food
    app.delete('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const result = await foodsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

  } catch (err) {
    console.error(" MongoDB Connection Error:", err);
  }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send(' Food expiry tracker is running');
});

// Server start
app.listen(port, () => {
  console.log(` Server is running on port ${port}`);
});
