import { useEffect, useState } from "react";

type SellerData = {
  name: string;
  salary: string;
};

type CategoryEntry = {
  category: string;
  value: string;
};

type CategoryData = {
  [sellerName: string]: {
    forecast: CategoryEntry[];
    share: CategoryEntry[];
  };
};

type PlanData = {
  [sellerName: string]: CategoryEntry[];
};

const SHEET_ID = "1mck-_m5gvTUSRVooya2h5_u5ERFhPoit9puspDvPkYs";
const API_KEY = "AIzaSyChRmO6HJboacuV3nYg3hJHiYSDLMkr5Vw";

const MAIN_RANGE = "Таблиця!A7:P11";
const FORECAST_RANGE = "Таблиця!H14:N21";
const SHARE_RANGE = "Таблиця!H23:L31";
const PLAN_RANGE = "Таблиця!A6:E11";

function App() {
  const [data, setData] = useState<SellerData[]>([]);
  const [categories, setCategories] = useState<CategoryData>({});
  const [plan, setPlan] = useState<PlanData>({});
  const [loading, setLoading] = useState(true);
  const [showPlanFor, setShowPlanFor] = useState<{ [name: string]: boolean }>(
    {}
  );

  useEffect(() => {
    async function fetchAll() {
      try {
        const [sellerRes, forecastRes, shareRes, planRes] = await Promise.all([
          fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${MAIN_RANGE}?key=${API_KEY}`
          ),
          fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${FORECAST_RANGE}?key=${API_KEY}`
          ),
          fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHARE_RANGE}?key=${API_KEY}`
          ),
          fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${PLAN_RANGE}?key=${API_KEY}`
          ),
        ]);

        const [sellerJson, forecastJson, shareJson, planJson] =
          await Promise.all([
            sellerRes.json(),
            forecastRes.json(),
            shareRes.json(),
            planRes.json(),
          ]);

        const sellerRows = sellerJson.values || [];

        const sellers: SellerData[] = sellerRows.map((row: string[]) => ({
          name: row[0] || "—",
          salary: row[15] || "—",
        }));

        // Обробка прогнозів і часток (як було)
        const forecastData: CategoryData = {};
        const headerF = forecastJson.values?.[0]?.slice(1) || [];

        for (let i = 1; i < forecastJson.values.length; i++) {
          const row = forecastJson.values[i];
          const name = row[0];
          forecastData[name] = {
            forecast: headerF.map((cat, idx) => ({
              category: cat,
              value: row[idx + 1] || "—",
            })),
            share: [],
          };
        }

        const headerS = shareJson.values?.[0]?.slice(1) || [];
        for (let i = 1; i < shareJson.values.length; i++) {
          const row = shareJson.values[i];
          const name = row[0];
          if (!forecastData[name]) {
            forecastData[name] = { forecast: [], share: [] };
          }
          forecastData[name].share = headerS.map((cat, idx) => ({
            category: cat,
            value: row[idx + 1] || "—",
          }));
        }

        // Обробка Плану
        const planData: PlanData = {};
        const planRows = planJson.values || [];
        const headerPlan = planRows[0]?.slice(1) || [];
        for (let i = 1; i < planRows.length; i++) {
          const row = planRows[i];
          const name = row[0];
          planData[name] = headerPlan.map((cat, idx) => ({
            category: cat,
            value: row[idx + 1] || "—",
          }));
        }

        setData(sellers);
        setCategories(forecastData);
        setPlan(planData);
        setLoading(false);
      } catch (err) {
        console.error("Помилка завантаження даних", err);
      }
    }

    fetchAll();
  }, []);

  // Функції для кольорів — залишаються без змін
  const getForecastColor = (value: string) => {
    const num = parseFloat(value.replace(",", "."));
    if (isNaN(num)) return "text-gray-300";
    if (num > 100) return "text-green-300";
    if (num >= 50) return "text-orange-300";
    return "text-red-400";
  };

  const getShareColor = (category: string, value: string) => {
    if (category !== "Частка доп.послуг + страховки") {
      return "text-white";
    }
    const numericValue = parseFloat(
      value.replace("%", "").replace(",", ".").trim()
    );
    if (isNaN(numericValue)) return "text-white";
    if (numericValue < 2) return "text-red-400";
    if (numericValue < 4) return "text-orange-400";
    return "text-green-400";
  };

  // Обробник toggle для плану
  const togglePlan = (name: string) => {
    setShowPlanFor((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div className="min-h-screen p-4 text-white bg-gray-900 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold">
        📊 Показники продавців Samsung
      </h1>

      {loading ? (
        <p>Завантаження...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item, index) => (
            <div
              key={index}
              className="p-4 bg-gray-800 border border-gray-700 shadow-lg rounded-xl"
            >
              <p className="mb-2 text-lg font-bold text-yellow-400">
                👤 {item.name}
              </p>
              <p>
                💸 Зп + Премія:{" "}
                <span className="font-semibold text-blue-400">
                  {item.salary} грн
                </span>
              </p>

              {categories[item.name] ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="mb-1 text-sm text-gray-400">
                      📂 Прогноз по категоріях:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categories[item.name].forecast.map((entry, i) => (
                        <div
                          key={i}
                          className="px-3 py-1 text-sm text-white bg-gray-700 rounded-lg shadow-sm"
                        >
                          {entry.category}:{" "}
                          <span className={getForecastColor(entry.value)}>
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-gray-400">
                      📊 Частка по категоріях:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categories[item.name].share.map((entry, i) => (
                        <div
                          key={i}
                          className="px-3 py-1 text-sm text-white bg-gray-700 rounded-lg shadow-sm"
                        >
                          {entry.category}:{" "}
                          <span
                            className={getShareColor(
                              entry.category,
                              entry.value
                            )}
                          >
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Кнопка для показу/приховання Плану */}
                  <button
                    onClick={() => togglePlan(item.name)}
                    className="px-4 py-1 mt-3 text-sm bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {showPlanFor[item.name] ? "Сховати План" : "Показати План"}
                  </button>

                  {/* Відображення Плану по кліку */}
                  {showPlanFor[item.name] && plan[item.name] ? (
                    <div className="mt-3">
                      <p className="mb-1 text-sm text-gray-400">
                        📅 План по категоріях:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {plan[item.name].map((entry, i) => (
                          <div
                            key={i}
                            className="px-3 py-1 text-sm text-white bg-gray-700 rounded-lg shadow-sm"
                          >
                            {entry.category}: {entry.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-red-400">
                  ❗ Дані про прогноз і частку відсутні
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
