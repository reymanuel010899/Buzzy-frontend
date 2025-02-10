import React, { useEffect } from 'react';
import { getMedia } from '../../redux/actions/getMedia';

const StreamingUI = () => {
    useEffect(()=>{
        getMedia()
    })
    return (
        <div className="bg-gradient-to-r from-white-900 via-gray-800 to-gray-900 text-white min-h-screen font-sans">

            <main className="pt-24 p-6">
                <section className="relative w-full h-[500px] flex items-center justify-center text-center">
                    <div className="relative w-full h-full bg-cover bg-center rounded-lg overflow-hidden" style={{ backgroundImage: "url('https://via.placeholder.com/1600x900')" }}>
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center px-4">
                            <h2 className="text-5xl font-extrabold text-blue-400 animate-pulse">iniciar transmision en vivo</h2>
                            <button className="mt-6 px-8 py-3 bg-purple-600 rounded-full text-lg shadow-xl hover:bg-purple-700 transition duration-300">Start</button>
                        </div>
                    </div>
                </section>
                
                <section className="mt-10">
                    <h3 className="text-3xl font-semibold text-center mb-6">Trending Series</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {["Levid", "New Releases", "Featured", "Top Rated", "Levid", "New Releases", "Featured", "Top Rated", "Levid", "New Releases", "Featured", "Top Rated"].map((title, index) => (
                            <div key={index} className="bg-gray-800 bg-opacity-70 p-4 rounded-lg hover:scale-105 transform transition duration-300">
                                <img src="https://media.es.wired.com/photos/6442dda9a566376ee967ba15/16:9/w_1600,c_limit/The-Sludgification-Of-Music-Business-503493283.jpg" alt={title} className="rounded-lg shadow-lg" />
                                <p className="mt-3 text-lg font-semibold text-center">{title}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default StreamingUI;
