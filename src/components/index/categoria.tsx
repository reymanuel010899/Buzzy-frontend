import { useTranslation } from "react-i18next";

const Categories = () => {
  const { t } = useTranslation('videos');

  const categories = [
    t('feed.catAction'),
    t('feed.catDrama'),
    t('feed.catComedy'),
    t('feed.catSciFi'),
    t('feed.catHorror'),
    t('feed.catAdventure'),
    t('feed.catRomance'),
    t('feed.catAnimation'),
    t('feed.catDocumentary'),
    t('feed.catFantasy'),
  ];

  return (
    <div className="relative mb-6">
      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex gap-3 pb-4">
          {categories.map((cat, index) => (
            <button
              key={index}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-full hover:bg-purple-600 hover:text-white transition-all duration-300 text-sm font-medium flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none"></div>
    </div>
  );
};

export default Categories;
