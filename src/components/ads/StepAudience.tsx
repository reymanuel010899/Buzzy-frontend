import React, { useState } from "react";
import { motion } from "framer-motion";
import { Target, Search, X, MapPin, Loader2 } from "lucide-react";
import { useGeolocation } from "../../hooks/useGeolocation";
import { Autocomplete, useLoadScript } from "@react-google-maps/api";

const libraries: ("places")[] = ["places"];

interface StepAudienceProps {
    data: any;
    setData: (data: any) => void;
    errors?: Record<string, boolean>;
    shakeTrigger?: number;
}

const shake = {
    x: [0, -8, 8, -8, 8, -4, 4, 0],
    transition: { duration: 0.45 }
}

const StepAudience: React.FC<StepAudienceProps> = ({ data, setData, errors = {}, shakeTrigger = 0 }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [intInput, setIntInput] = useState("");
    const { getCurrentLocation, loading: geoLoading, error: geoError } = useGeolocation();

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "EJEMPLO_REEMPLAZAR",
        libraries,
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const onLoadAutocomplete = (auto: google.maps.places.Autocomplete) => {
        setAutocomplete(auto);
    };

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();

            const placeName = place.formatted_address || place.name;
            if (!placeName) return;

            // Conservar lat/lng previos si no hay geometry
            let lat = data.audience.latitude || 0;
            let lng = data.audience.longitude || 0;

            if (place.geometry && place.geometry.location) {
                lat = place.geometry.location.lat();
                lng = place.geometry.location.lng();
            }

            if (!data.audience.locations.includes(placeName)) {
                setData((prev: any) => ({
                    ...prev,
                    audience: {
                        ...prev.audience,
                        locations: [...prev.audience.locations, placeName],
                        latitude: lat,
                        longitude: lng,
                        radius: prev.audience.radius || 50
                    }
                }));
            }

            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    };

    const handleUseCurrentLocation = async () => {
        const coords = await getCurrentLocation();
        if (coords) {
            if (!data.audience.locations.includes("Mi Ubicación Actual")) {
                setData((prev: any) => ({
                    ...prev,
                    audience: {
                        ...prev.audience,
                        locations: [...prev.audience.locations, "Mi Ubicación Actual"],
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        radius: prev.audience.radius || 50
                    }
                }));
            } else {
                setData((prev: any) => ({
                    ...prev,
                    audience: {
                        ...prev.audience,
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        radius: prev.audience.radius || 50
                    }
                }));
            }
        }
    };

    const removeLocation = (loc: string) => {
        const isCurrentLoc = loc === "Mi Ubicación Actual";
        setData({
            ...data,
            audience: {
                ...data.audience,
                locations: data.audience.locations.filter((l: string) => l !== loc),
                ...(isCurrentLoc ? { latitude: null, longitude: null, radius: null } : {})
            }
        });
    };


    const addInterest = () => {
        if (intInput && !data.audience.interests.includes(intInput)) {
            setData({
                ...data,
                audience: { ...data.audience, interests: [...data.audience.interests, intInput] }
            });
            setIntInput("");
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Define tu Audiencia</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">¿A quién quieres llegar?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Col: Demographics */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-cyan-400/80 uppercase tracking-[0.25em]">Demografía</h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-500 uppercase">Edad Mín</label>
                                <input
                                    type="number"
                                    value={data.audience.age_min}
                                    onChange={(e) => setData({ ...data, audience: { ...data.audience, age_min: parseInt(e.target.value) } })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-500 uppercase">Edad Máx</label>
                                <input
                                    type="number"
                                    value={data.audience.age_max}
                                    onChange={(e) => setData({ ...data, audience: { ...data.audience, age_max: parseInt(e.target.value) } })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase">Sexo</label>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                {["ALL", "MALE", "FEMALE"].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setData({ ...data, audience: { ...data.audience, gender: g } })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${data.audience.gender === g ? 'bg-cyan-500 text-white' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        {g === 'ALL' ? 'Todos' : g === 'MALE' ? 'Hombres' : 'Mujeres'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-cyan-500/10 border border-cyan-500/20 p-5 rounded-2xl space-y-3 shadow-xl shadow-cyan-500/5">
                        <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                            <div>
                                <h5 className="text-[11px] font-black text-white uppercase tracking-wider">Frecuencia máxima</h5>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Veces que cada persona ve tu anuncio por día</p>
                            </div>
                            <span className="ml-auto text-lg font-black text-cyan-400">{data.audience.max_frequency ?? 3}×</span>
                        </div>
                        <input
                            type="range"
                            min="1" max="10"
                            value={data.audience.max_frequency ?? 3}
                            onChange={(e) => setData({ ...data, audience: { ...data.audience, max_frequency: parseInt(e.target.value) } })}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-[9px] text-gray-600 font-bold uppercase">
                            <span>1× (menos intrusivo)</span>
                            <span>10× (máx exposición)</span>
                        </div>
                    </div>
                </div>

                {/* Right Col: Interests & Locations */}
                <div className="space-y-6">
                    {/* Locations */}
                    <motion.div
                        key={`locations-${shakeTrigger}`}
                        animate={errors.locations ? shake : {}}
                        className="space-y-2"
                    >
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ubicaciones</label>
                        <div className="relative">
                            {isLoaded ? (
                                <Autocomplete
                                    onLoad={onLoadAutocomplete}
                                    onPlaceChanged={onPlaceChanged}
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                            }
                                        }}
                                        placeholder="Añadir ciudad o país..."
                                        className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-white text-sm ${errors.locations ? 'border-red-500' : 'border-white/10'}`}
                                    />
                                </Autocomplete>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Cargando mapa..."
                                    disabled
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-gray-500 text-sm"
                                />
                            )}
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        </div>
                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={geoLoading}
                            className="w-full mt-3 flex items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-500/20 py-2.5 rounded-xl text-cyan-400 text-xs font-black uppercase hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                        >
                            {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                            Usar mi ubicación actual
                        </button>
                        {geoError && <p className="text-red-400 text-[10px] mt-1">{geoError}</p>}

                        {(data.audience.latitude && data.audience.longitude && data.audience.locations.includes("Mi Ubicación Actual")) && (
                            <div className="mt-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                                <span className="text-[9px] font-black text-cyan-400/70 uppercase tracking-widest whitespace-nowrap">Radio</span>
                                <input
                                    type="range"
                                    min="5" max="200" step="5"
                                    value={data.audience.radius || 50}
                                    onChange={(e) => setData({ ...data, audience: { ...data.audience, radius: parseInt(e.target.value) } })}
                                    className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <span className="text-[9px] font-black text-white whitespace-nowrap">{data.audience.radius || 50} km</span>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-4">
                            {data.audience.locations.map((loc: string) => (
                                <span key={loc} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full text-xs text-gray-300 border border-white/10">
                                    {loc}
                                    <X
                                        className="w-3 h-3 cursor-pointer hover:text-red-400"
                                        onClick={() => removeLocation(loc)}
                                    />
                                </span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Interests */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Intereses</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={intInput}
                                onChange={(e) => setIntInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                                placeholder="Ej: Fitness, Tecnología, Moda..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm"
                            />
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {data.audience.interests.map((int: string) => (
                                <span key={int} className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-full text-xs text-cyan-400 border border-cyan-500/20">
                                    {int}
                                    <X
                                        className="w-3 h-3 cursor-pointer hover:text-red-400"
                                        onClick={() => setData({ ...data, audience: { ...data.audience, interests: data.audience.interests.filter((i: string) => i !== int) } })}
                                    />
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepAudience;
