const mongoose = require('mongoose');
const uri = 'mongodb://aabhishekjain53_db_user:Tk79k5PBmtKT8soY@ac-m3wmebi-shard-00-00.nbnfgi1.mongodb.net:27017,ac-m3wmebi-shard-00-01.nbnfgi1.mongodb.net:27017,ac-m3wmebi-shard-00-02.nbnfgi1.mongodb.net:27017/billingsofttware?ssl=true&replicaSet=atlas-vnpjal-shard-0&authSource=admin';

console.log("Connecting to MongoDB...");
mongoose.connect(uri)
  .then(() => {
    console.log("SUCCESS: Connected to MongoDB Atlas successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("ERROR: Failed to connect:", err);
    process.exit(1);
  });
