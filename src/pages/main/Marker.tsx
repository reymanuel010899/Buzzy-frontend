import { useState } from "react";
import { FiSearch,  FiSun, FiMoon } from "react-icons/fi";
import { motion } from "framer-motion";
import { FaPlusCircle } from "react-icons/fa";
import BottomNavbar from "../../components/Layout/ButtonNavar";
const categories = ["Electrónica", "Moda", "Hogar", "Juguetes", "Deportes", "Libros"];
const locations = ["Ciudad de México", "Guadalajara", "Monterrey", "Cancún"];
const products = [
  { id: 1, name: "Smartphone X", price: "$799", category: "Electrónica", location: "Ciudad de México", image: "https://via.placeholder.com/150" },
  { id: 2, name: "Zapatillas Deportivas", price: "$120", category: "Moda", location: "Guadalajara", image: "https://via.placeholder.com/150" },
  { id: 3, name: "Laptop Pro", price: "$1299", category: "Electrónica", location: "Monterrey", image: "https://via.placeholder.com/150" },
  { id: 4, name: "Auriculares Bluetooth", price: "$199", category: "Electrónica", location: "Cancún", image: "https://via.placeholder.com/150" }
];

const Marketplace = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  
  const filteredProducts = products.filter(product => 
    (!selectedCategory || product.category.toLowerCase() === selectedCategory.toLowerCase()) &&
    (!selectedLocation || product.location.toLowerCase() === selectedLocation.toLowerCase()) &&
    (!search.trim() || product.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-200 text-black"}`}> 
        <h1 className="text-3xl text-center p-5 sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
          Marketplace
        </h1>
      <header className="flex items-center justify-between p-6 shadow-lg bg-opacity-90 backdrop-blur-md">
        <div className="flex space-x-4 items-center">
            <FaPlusCircle size={35} />
          <motion.div  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              className="px-7 py-4 rounded-full shadow-md bg-gray-800 text-white focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FiSearch  className="absolute top-5 right-3 text-gray-400" />
          </motion.div>
          <motion.button 
            onClick={() => setDarkMode(!darkMode)}
            className="text-xl p-2 rounded-full bg-white hover:bg-gray-600 transition"
          
            whileHover={{ scale: 1.1 }}
          >
            {darkMode ? <FiSun color="black"/> : <FiMoon color="black"/>}
          </motion.button>
        </div>
      </header>
      
      <motion.div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-x-6 sm:space-y-0 p-4 bg-gray-900 text-white shadow-md" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
        <motion.div className="relative w-full sm:w-auto">
          <select className="w-full px-2 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">Todas las Categorías</option>
            {categories.map((category) => (
              <option className="w-28" key={category} value={category}>{category}</option>
            ))}
          </select>
        </motion.div>
        
        <motion.div className="relative w-full sm:w-auto">
          <select className="w-full px-4 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
            <option value="">Todas las Ubicaciones</option>
            {locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </motion.div>
      </motion.div>
      
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <motion.div key={product.id} className="bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-2xl transition transform hover:scale-105" whileHover={{ scale: 1.05 }}>
              <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded-t-lg" />
              <h2 className="text-xl font-semibold mt-2">{product.name}</h2>
              <p className="text-lg text-purple-400">{product.price}</p>
            </motion.div>
          ))
        ) : (
          <p className="text-center col-span-full text-gray-400">No se encontraron productos</p>
        )}
      </motion.div>
      <BottomNavbar/>
    </div>
  );
};

export default Marketplace;
