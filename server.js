const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ========================================================
// 🛠️ 1. MIDDLEWARES GLOBALES
// ========================================================
app.use(express.json());
app.use(cors());

// ========================================================
// 🗄️ 2. MODELO Y RUTAS DE CHOFERES (GEOESPECIALES)
// ========================================================
const DriverSchema = new mongoose.Schema({
  driverName: { type: String, default: "Carlos Gas Verificado" },
  plate: { type: String, default: "UBA-2026" },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitud, latitud]
  }
});

// Índice necesario en MongoDB Atlas para búsquedas de proximidad
DriverSchema.index({ location: "2dsphere" });
const Driver = mongoose.model('Driver', DriverSchema);

// 📍 Endpoint A: Sincronizar o crear Chofer de Pruebas en Atlas
app.post('/api/drivers/sync-test', async (req, res) => {
  const { longitude, latitude } = req.body;
  try {
    const driver = await Driver.findOneAndUpdate(
      { _id: "65f987654321098765432109" },
      {
        driverName: "Carlos Gas Verificado",
        plate: "UBA-2026",
        location: { type: "Point", coordinates: [longitude, latitude] }
      },
      { upsert: true, new: true }
    );
    console.log(`📍 Chofer de pruebas sincronizado en coordenadas: [${longitude}, ${latitude}]`);
    return res.status(200).json(driver);
  } catch (error) {
    console.error("❌ Error en sync-test:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 🔍 Endpoint B: Buscar Choferes cercanos en un radio de 5km
app.post('/api/drivers/nearby', async (req, res) => {
  const { longitude, latitude } = req.body;
  try {
    const drivers = await Driver.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: 5000 // 5000 metros = 5 kilómetros
        }
      }
    });
    return res.status(200).json(drivers);
  } catch (error) {
    console.error("❌ Error en nearby:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 🗄️ 3. MODELO DE ÓRDENES (SCHEMA)
// ========================================================
const OrderSchema = new mongoose.Schema({
  client: { type: String, required: true },
  driver: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'delivered'], default: 'pending' },
  eta: { type: Number, default: 7 },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

// ========================================================
// 📦 4. ENDPOINT PARA CREAR UN PEDIDO
// ========================================================
app.post('/api/orders/create', async (req, res) => {
  const { clientId, driverId, driver } = req.body;
  
  // Respaldo de variables dobles para prevenir desajustes con Mongoose
  const finalDriverId = driverId || driver || "65f987654321098765432109";
  
  console.log(`➡️ [POST] /orders/create -> Cliente: ${clientId} vinculando a Chofer: ${finalDriverId}`);

  try {
    const newOrder = new Order({ 
      client: clientId, 
      driver: finalDriverId, 
      status: 'pending' 
    });
    
    await newOrder.save();
    console.log(`✅ Pedido guardado con éxito en Atlas bajo estado PENDING.`);
    return res.status(201).json(newOrder);
  } catch (error) {
    console.error("❌ Error al insertar pedido:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 📡 5. ENDPOINT DE CONSULTA DE ÓRDENES ACTIVAS (COLA MULTIPLE FIFO)
// ========================================================
app.get('/api/orders/driver/:driverId', async (req, res) => {
  const { driverId } = req.params;
  try {
    // Retorna pedidos 'pending' o 'accepted' del chofer ordenados por antigüedad cronológica
    const activeOrders = await Order.find({ 
      driver: driverId,
      status: { $in: ['pending', 'accepted'] }
    }).sort({ createdAt: 1 });
    
    return res.status(200).json(activeOrders);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// ⚡ 6. ENDPOINT PARA ACEPTAR UN PEDIDO EN LA COLA
// ========================================================
app.put('/api/orders/accept/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'accepted', eta: 7 },
      { new: true }
    );
    console.log(`⚡ Pedido ${orderId} actualizado a ACCEPTED.`);
    return res.status(200).json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 🛑 7. ENDPOINT PARA MARCAR COMO ENTREGADO
// ========================================================
app.put('/api/orders/deliver/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'delivered' },
      { new: true }
    );
    console.log(`📦 Pedido ${orderId} actualizado a DELIVERED.`);
    return res.status(200).json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ========================================================
// 🌐 8. RUTA RAÍZ (Diagnóstico básico en el navegador)
// ========================================================
app.get('/', (req, res) => {
  res.send('🚀 Servidor Express de Gas-Express activo y respondiendo.');
});

// ========================================================
// 🔌 9. CONEXIÓN A MONGO DB ATLAS Y PUERTO DINÁMICO
// ========================================================
const MONGO_URI = process.env.MONGO_URI || "tu_cadena_de_conexion_a_mongodb_atlas_aqui";
const PORT = process.env.PORT || 5000; // Asignación dinámica limpia para Render

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("🔥 MongoDB Conectado con éxito a Atlas.");
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en el puerto HTTP: ${PORT}`);
    });
  })
  .catch(err => console.error("❌ Fallo crítico de conexión a Mongo:", err));
