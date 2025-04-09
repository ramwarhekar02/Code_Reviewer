const express = require('express');
const aiRoutes = require("./routes/ai.routes")
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(cors());
app.use("/ai", aiRoutes);

app.post("/" , (req, res)=> { 
    res.send("Hello World");
})


module.exports = app;

