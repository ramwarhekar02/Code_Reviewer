require("dotenv").config();
const app = require('./src/app');

app.get("/", (req, res)=>{ 
    res.send("Hello")
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
//Done