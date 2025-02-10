import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { IDataSignUp } from "../../componets/auth/auth.interface";
import { register } from "../../redux/actions/register";
import { useDispatch } from 'react-redux';

const SignUp: React.FC = () => {
  const dispatch = useDispatch(); 
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<IDataSignUp>({
    name: "",
    username: "",
    email: "",
    password: "",
    repeat_password: "",
  });

  const {name, username, email, password, repeat_password} = formData;
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log(e.target.value)

    setFormData(prevState => ({...prevState, [e.target.name]: e.target.value}));
        
};

  const handleSubmit = (e: React.FormEvent) => {
    
    e.preventDefault();
    if (formData?.password !== formData?.repeat_password) {
      alert("Las contraseñas no coinciden");
      return;
    }

    register(formData)(dispatch)
   
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 max-w-md w-full"
      >
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white text-center mb-6">
          Crear Cuenta
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Nombre */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre completo"
              name="name"
              value={name}
              onChange={(e) => onChange(e)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              required
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="username"
              placeholder="username"
              value={username}
              onChange={(e) => onChange(e)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              required
            />
          </div>

          {/* Campo Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => onChange(e)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              required
            />
          </div>

          {/* Campo Contraseña */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              name="password"
              value={password}
              onChange={(e) => onChange(e)}
              className="w-full pl-10 pr-12 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirmar Contraseña */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="repeat_password"
              placeholder="Confirmar contraseña"
              value={repeat_password}
              onChange={(e) => onChange(e)}
              className="w-full pl-10 pr-12 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Botón de Registro */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all"
          >
            Registrarse
          </button>
        </form>

        {/* Enlaces Adicionales */}
        <div className="text-center mt-4 text-gray-600 dark:text-gray-400">
          ¿Ya tienes una cuenta?{" "}
          <Link to={'/sign-in'}>Inicia sesión</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUp;
