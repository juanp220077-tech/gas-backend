const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Driver = require('./models/Driver');
const Order = require('./models/Order');
const User = require('./models/User');

const app = express();

app.use(cors());
app.use(express.json());

// ========================================================
// 🗄️ CONEXIÓN A MONGO DB ATLAS
// ========================================================
// REEMPLAZA AQUÍ CON TU CADENA DE CONEXIÓN REAL DE ATLAS
const MONGO_URI = "mongodb+srv://juanp220077_db_user:P43nt32026@cluster0.1husfjv.mongodb.net/?appName=Cluster0"; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("🔥 MongoDB Conectado con éxito. Rutas geoespaciales listas."))
  .catch(err => console.error("❌ Error crítico de conexión a MongoDB:", err));


// ========================================================
// 🔄 1. ENDPOINT DE SINCRONIZACIÓN AUTOMÁTICA
// ========================================================
app.post('/api/drivers/sync-test', async (req, res) => {
  const { longitude, latitude } = req.body;
  console.log(`➡️ [POST] /api/drivers/sync-test -> Lng: ${longitude}, Lat: ${latitude}`);
  try {
    const updatedDriver = await Driver.findByIdAndUpdate(
      "65f987654321098765432109",
      {
        driverName: "Carlos Gas Verificado",
        plate: "UBA-2026",
        status: 'available',
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        }
      },
      { new: true, upsert: true }
    );
    return res.status(200).json({ message: "🚚 Camión sincronizado", updatedDriver });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


// ========================================================
// 📍 2. ENDPOINT DE BÚSQUEDA CERCANA ($near)
// ========================================================
app.post('/api/drivers/nearby', async (req, res) => {
  const { longitude, latitude } = req.body;
  try {
    const nearbyDrivers = await Driver.find({
      status: 'available',
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: 50000 // 50 km
        }
      }
    });
    return res.status(200).json(nearbyDrivers);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


// ========================================================
// 📦 3. ENDPOINT PARA CREAR UN PEDIDO
// ========================================================
app.post('/api/orders/create', async (req, res) => {
  const { clientId, driverId } = req.body;
  try {
    const newOrder = new Order({ client: clientId, driver: driverId, status: 'pending' });
    await newOrder.save();
    console.log("✅ Pedido registrado con estado PENDING.");
    return res.status(201).json(newOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


// ========================================================
// 🚚 4. ENDPOINT PARA ACEPTAR PEDIDO (REPARTIDOR)
// ========================================================
app.put('/api/orders/accept/:id', async (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body;
  try {
    const estimatedTime = 7; // 7 minutos fijos de prueba estática

    const updatedOrder = await Order.findByIdAndUpdate(id, {
      driver: driverId,
      status: 'accepted',
      eta: estimatedTime
    }, { new: true });

    await Driver.findByIdAndUpdate(driverId, { status: 'busy' });
    console.log(`✅ Pedido aceptado. ETA: ${estimatedTime} min.`);
    return res.status(200).json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


// ========================================================
// 🛑 5. ENDPOINT PARA FINALIZAR ENTREGA (MARCAR COMO ENTREGADO)
// ========================================================
app.put('/api/orders/deliver/:id', async (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body;
  console.log(`➡️ [PUT] /api/orders/deliver/${id} -> Finalizando entrega.`);
  try {
    const updatedOrder = await Order.findByIdAndUpdate(id, {
      status: 'delivered',
      eta: null
    }, { new: true });

    // Liberamos al camión pasándolo de nuevo a disponible
    await Driver.findByIdAndUpdate(driverId, { status: 'available' });
    console.log("✅ Pedido finalizado con éxito en Atlas.");
    return res.status(200).json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


// ========================================================
// 📡 6. ENDPOINT DE CONSULTA DE ÓRDENES ACTIVAS
// ========================================================
app.get('/api/orders/driver/:driverId', async (req, res) => {
  const { driverId } = req.params;
  try {
    // Busca la última orden asignada que no esté entregada, o la última entregada reciente
    const activeOrder = await Order.findOne({ driver: driverId })
      .sort({ createdAt: -1 });
    return res.status(200).json(activeOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Express ejecutándose en http://localhost:${PORT}`);
});
