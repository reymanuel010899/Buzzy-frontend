import { motion } from "framer-motion";
import { LifeBuoy, Send, ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function SupportForm({ onBack }: { onBack?: () => void }) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        issue: "",
        message: ""
    });

    const handleChange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: any) => {
        e.preventDefault();
        console.log("Support Request:", form);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-6">

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0c0e1a] border border-white/10 rounded-3xl w-full max-w-md p-8 text-center shadow-2xl"
            >

                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center"
                >
                    <LifeBuoy className="text-blue-400" size={28} />
                </motion.div>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-black text-white mb-3 uppercase"
                >
                    Soporte
                </motion.h2>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-400 text-sm mb-6"
                >
                    Si tienes algún problema con tu cuenta o pagos, envíanos un mensaje y nuestro equipo te ayudará lo antes posible.
                </motion.p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 text-left">

                    {/* Name */}
                    <input
                        type="text"
                        name="name"
                        placeholder="Nombre"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                        required
                    />

                    {/* Email */}
                    <input
                        type="email"
                        name="email"
                        placeholder="Correo electrónico"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                        required
                    />

                    {/* Issue Select */}
                   <select
                        name="issue"
                        value={form.issue}
                        onChange={handleChange}
                        className="w-full bg-[#0c0e1a]  text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400"
                        required
                    >
                        <option value="" className="text-white">Selecciona un problema</option>
                        <option value="payments" className="text-white">Problema con pagos</option>
                        <option value="withdraw" className="text-white">Problema con retiros</option>
                        <option value="verification" className="text-white">Problema con verificación</option>
                        <option value="account" className="text-white">Problema con mi cuenta</option>
                        <option value="bug" className="text-white">Error en la aplicación</option>
                        <option value="other" className="text-white">Otro</option>
                    </select>


                    {/* Message */}
                    <textarea
                        name="message"
                        placeholder="Describe tu problema..."
                        value={form.message}
                        onChange={handleChange}
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                        required
                    />

                    {/* Submit */}
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7000ff] to-[#00f0ff] py-3 rounded-xl font-bold text-white"
                    >
                        <Send size={18} />
                        Enviar solicitud
                    </button>

                </form>

                {/* Back */}
                <button
                    onClick={onBack}
                    className="mt-6 flex items-center justify-center gap-2 text-gray-400 hover:text-white w-full"
                >
                    <ArrowLeft size={16} />
                    Volver
                </button>

            </motion.div>
        </div>
    );
}
