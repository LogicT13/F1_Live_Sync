import re

with open("frontend/src/LiveApp.tsx", "r") as f:
    content = f.read()

content = content.replace(
"""            {/* Scrubber Thumb */}
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all duration-200 pointer-events-none"
                 style={{ left: `calc(${live.totalTime > 0 ? ((live.frame?.timestamp || 0) / live.totalTime) * 100 : 0}%)`, transform: 'translate(-50%, -50%)' }}
            />""",
"""            {/* Scrubber Thumb */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all duration-200 pointer-events-none"
                 style={{ left: `calc(${live.totalTime > 0 ? ((live.frame?.timestamp || 0) / live.totalTime) * 100 : 0}%)` }}
            />"""
)

with open("frontend/src/LiveApp.tsx", "w") as f:
    f.write(content)
