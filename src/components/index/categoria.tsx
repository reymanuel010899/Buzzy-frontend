const Categories = () => {
    const categories = ["Acción", "Drama", "Comedia", "Ciencia Ficción", "Terror", "Acción", "Drama", "Comedia", "Ciencia Ficción", "Terror"];
  
    return (
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex gap-3">
            {categories.map((cat, index) => (
              <button
                key={index}
                className="px-2 py-2 bg-gray-500 rounded-lg hover:bg-gray-600 transition mb-2 flex-shrink-0"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
    );
  };
  
  export default Categories;
  