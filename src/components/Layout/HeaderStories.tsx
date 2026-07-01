import React from "react";
import { motion } from "framer-motion";
import { Gem } from "lucide-react";
import { useHeaderStoriesStore } from "../../store/headerStoriesStore";
import { getMediaUrl } from "../../redux/client/api-client";

interface HeaderStoriesProps {
  inline?: boolean;
  showLabels?: boolean;
}

const HeaderStories: React.FC<HeaderStoriesProps> = ({ inline = false, showLabels = true }) => {
  const {
    enabled,
    groups,
    onStoryClick,
  } = useHeaderStoriesStore();

  if (!enabled) return null;

  return (
    <div className={inline ? "flex flex-1 items-center overflow-hidden" : "w-full border-t border-white/5 bg-black/90 backdrop-blur-xl"}>
      <div className={inline ? "flex flex-1 items-center gap-3 overflow-x-auto px-2 py-0 snap-x scrollbar-hide" : "flex gap-3 overflow-x-auto px-2 sm:px-6 py-2.5 snap-x scrollbar-hide"}>
        {groups.map((story, i) => (
          <motion.button
            key={story.id || i}
            type="button"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.16, delay: i * 0.02 }}
            className={`relative flex flex-col items-center gap-1 snap-start group ${inline ? "min-w-[34px]" : "min-w-[40px]"}`}
            onClick={() => onStoryClick(i)}
            aria-label={`Ver historias de ${story.user.username}`}
          >
            <div className="relative">
              {story.hasSubscriberStory ? (
                <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[#ffd700] via-[#34d399] to-[#10b981] opacity-90 blur-[0.5px] animate-spin-slow shadow-[0_0_10px_rgba(16,185,129,0.55)]" />
              ) : (
                <div className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[#7000ff] via-[#ff0099] to-[#00f0ff] opacity-80 blur-[0.5px] animate-spin-slow" />
              )}
              <div className={`relative rounded-full p-[2px] bg-[#050718] overflow-hidden ${inline ? "h-[34px] w-[34px]" : "h-[40px] w-[40px]"}`}>
                <img
                  src={getMediaUrl(story.user.profile_picture || "/avatar.webp")}
                  alt={story.user.username}
                  className="w-full h-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              {story.hasSubscriberStory && (
                <div className="absolute -bottom-0.5 -right-0.5 z-10 flex h-[12px] w-[12px] items-center justify-center rounded-full bg-[#050718] ring-[1.5px] ring-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.7)]">
                  <Gem size={9} className="text-emerald-400" />
                </div>
              )}
            </div>
            {showLabels && (
              <span
                className="text-[9px] font-medium truncate w-[40px] text-center text-gray-300 group-hover:text-[#00f0ff] transition-colors"
              >
                {story.user.username}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(HeaderStories);
