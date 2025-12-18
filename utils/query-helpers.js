// utils/query-helpers.js

export function applyPagination(query, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  return query;
};
  
export function applySearch(baseQuery, searchTerm, columns) {
  if (!searchTerm) return { query: baseQuery, params: [] };
  
  const conditions = columns.map(col => `${col} LIKE ?`).join(" OR ");
  const hasWhere = baseQuery.includes('WHERE');
  
  return {
    query: `${baseQuery} ${hasWhere ? 'AND' : 'WHERE'} (${conditions})`,
    params: columns.map(() => `%${searchTerm}%`)
  };
}

export function applyFilters(baseQuery, filters) {
  const conditions = [];
  const params = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue;

    // Handle range filters
    if (key.startsWith("min_")) {
      const column = key.replace("min_", "");
      conditions.push(`${column} >= ?`);
      params.push(value);
    } else if (key.startsWith("max_")) {
      const column = key.replace("max_", "");
      conditions.push(`${column} <= ?`);
      params.push(value);
    } else {
      // Handle normal equality filters
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (conditions.length > 0) {
    baseQuery += baseQuery.includes('WHERE') ? ' AND ' : ' WHERE ';
    baseQuery += conditions.join(' AND ');
  }  

  return { query: baseQuery, params };
};

export function applySorting(sortBy) {
  const sortOptions = {
    'newest': 'ORDER BY created_at DESC',
    'price_low': 'ORDER BY price ASC',
    'price_high': 'ORDER BY price DESC',
    'year_built': 'ORDER BY year_built DESC',
    'largest_sqft': 'ORDER BY area DESC',
    'photo_count': 'ORDER BY (SELECT COUNT(*) FROM properties_images WHERE properties_images.property_id = properties.property_id) DESC'
  };

  return sortOptions[sortBy] || 'ORDER BY created_at DESC';
};