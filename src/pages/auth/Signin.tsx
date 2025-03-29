import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FetchWithAuthProps } from "../../redux/actions/Login";
import { login } from "../../redux/actions/Login";
import { useDispatch } from 'react-redux';

const SignIn: React.FC = () => {
const dispatch = useDispatch()
  const navigate = useNavigate()
  const [data, setData] = useState<FetchWithAuthProps>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

   const {email, password} = data;
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {

      setData((prevState: FetchWithAuthProps) => ({...prevState, [e.target.name]: e.target.value}));

          
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(data)(dispatch).then(()=>{
      navigate('/')
    })
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
          Iniciar Sesión
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) =>onChange(e)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              required
            />
          </div>

          {/* Campo Contraseña con Icono de Ojo */}
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

          {/* Botón de Enviar */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all"
            onClick={e=>handleSubmit(e)}
          >
            Ingresar
          </button>
        </form>

        {/* Enlaces Adicionales */}
        <div className="text-center mt-4 text-gray-600 dark:text-gray-400">
          <a href="#" className="text-blue-500 hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <div className="text-center mt-2 text-gray-600 dark:text-gray-400">
          ¿No tienes cuenta?{" "}
          <Link to={'/sign-up'}> Regístrate</Link>
         
        </div>
      </motion.div>
    </div>
  );
};

export default SignIn;
