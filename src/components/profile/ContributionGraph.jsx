import clsx from "clsx";

const getLevelColor = (level) => {
  switch (level) {
    case 0: return "bg-[#ebedf0] dark:bg-[#161b22]";
    case 1: return "bg-[#9be9a8] dark:bg-[#0e4429]";
    case 2: return "bg-[#40c463] dark:bg-[#006d32]";
    case 3: return "bg-[#30a14e] dark:bg-[#26a641]";
    case 4: return "bg-[#216e39] dark:bg-[#39d353]";
    default: return "bg-[#ebedf0] dark:bg-[#161b22]";
  }
};

const getLevelForCount = (count, max) => {
  const n = Number(count) || 0;
  if (n <= 0) return 0;
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  const r = n / m;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
};

const ContributionGraph = ({ loading, error, data }) => {
  const days = Array.isArray(data?.days) ? data.days : [];
  const total = Number(data?.total) || 0;
  const max = Number(data?.max) || 0;
  const startDate = days[0]?.date ? new Date(days[0].date) : null;
  const offset = startDate ? startDate.getDay() : 0;
  const cells = startDate ? Array.from({ length: offset }).map(() => null).concat(days) : [];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md p-4 mb-6">
      <div className="flex justify-between items-center mb-2">
         <span className="text-sm font-normal text-github-light-text dark:text-github-dark-text">
           {loading ? "Loading contributions..." : `${total.toLocaleString()} contributions in the last year`}
         </span>
         <div className="flex items-center gap-2 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
             <span>Less</span>
             <div className="flex gap-1">
                 <div className="w-[10px] h-[10px] bg-[#ebedf0] dark:bg-[#161b22] rounded-[2px]"></div>
                 <div className="w-[10px] h-[10px] bg-[#9be9a8] dark:bg-[#0e4429] rounded-[2px]"></div>
                 <div className="w-[10px] h-[10px] bg-[#40c463] dark:bg-[#006d32] rounded-[2px]"></div>
                 <div className="w-[10px] h-[10px] bg-[#30a14e] dark:bg-[#26a641] rounded-[2px]"></div>
                 <div className="w-[10px] h-[10px] bg-[#216e39] dark:bg-[#39d353] rounded-[2px]"></div>
             </div>
             <span>More</span>
         </div>
      </div>

      {error ? (
        <div className="mb-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}
      
      <div className="overflow-x-auto">
        <div className="flex text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mb-1 ml-8 gap-8">
            {months.map(m => <span key={m}>{m}</span>)}
        </div>
        <div className="flex gap-1">
          <div className="flex flex-col gap-2 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mr-2 mt-2">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
          </div>
          <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
            {cells.length > 0 ? cells.map((cell, i) => {
              if (!cell) {
                return <div key={`empty-${i}`} className="w-[10px] h-[10px] rounded-[2px] bg-transparent" />;
              }
              const count = Number(cell.count) || 0;
              const level = getLevelForCount(count, max);
              return (
                <div
                  key={cell.date}
                  className={clsx("w-[10px] h-[10px] rounded-[2px]", getLevelColor(level))}
                  title={`${count} contributions on ${cell.date}`}
                />
              );
            }) : (
              Array.from({ length: 365 }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="w-[10px] h-[10px] rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22]"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributionGraph;
