const fs = require("fs/promises");

const getDefaultStats = () => ({ totalSubmissions: 0 });

const readStats = async (statsFile) => {
  try {
    const content = await fs.readFile(statsFile, "utf-8");
    return JSON.parse(content);
  } catch {
    return getDefaultStats();
  }
};

const incrementSubmissionCount = async (statsFile) => {
  const current = await readStats(statsFile);
  const next = {
    totalSubmissions: Number(current.totalSubmissions || 0) + 1,
  };
  await fs.writeFile(statsFile, JSON.stringify(next), "utf-8");
  return next.totalSubmissions;
};

module.exports = { incrementSubmissionCount };
