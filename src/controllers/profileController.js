const profiles = require('../data/profiles');
const { users } = require('../data/store');

// ── Natural Language Parser (Stage 2) ──────────────────────────────────────────
function parseNaturalLanguage(query) {
  const filters = {};
  const q = query.toLowerCase();

  if (q.includes('available')) filters.available = true;
  if (q.includes('unavailable') || q.includes('not available')) filters.available = false;

  const skillKeywords = ['react', 'node', 'python', 'javascript', 'typescript', 'go', 'java', 'docker', 'kubernetes', 'aws', 'postgresql', 'mongodb', 'redis'];
  const foundSkills = skillKeywords.filter(skill => q.includes(skill));
  if (foundSkills.length > 0) filters.skills = foundSkills;

  const expMatch = q.match(/(\d+)\+?\s*years?/);
  if (expMatch) filters.minExperience = parseInt(expMatch[1]);

  const roleMap = {
    'frontend': 'Frontend Engineer',
    'backend': 'Backend Engineer',
    'full stack': 'Full Stack Engineer',
    'devops': 'DevOps Engineer',
    'mobile': 'Mobile Developer',
    'data': 'Data Scientist',
    'security': 'Security Engineer'
  };
  for (const [key, val] of Object.entries(roleMap)) {
    if (q.includes(key)) {
      filters.role = val;
      break;
    }
  }

  const ratingMatch = q.match(/rating\s*(above|over|at least)?\s*(\d+\.?\d*)/);
  if (ratingMatch) filters.minRating = parseFloat(ratingMatch[2]);

  return filters;
}

// ── Main controller ───────────────────────────────────────────────────────────
function getProfiles(req, res) {
  let results = [...profiles];

  const {
    search, role, available, location, skills,
    minExperience, maxExperience, minRating,
    sortBy, sortOrder,
    page = 1, limit = 10,
    naturalLanguage
  } = req.query;

  // Natural language search
  if (naturalLanguage) {
    const nlFilters = parseNaturalLanguage(naturalLanguage);
    if (nlFilters.available !== undefined) results = results.filter(p => p.available === nlFilters.available);
    if (nlFilters.skills) results = results.filter(p => nlFilters.skills.some(s => p.skills.map(sk => sk.toLowerCase()).includes(s)));
    if (nlFilters.minExperience) results = results.filter(p => p.experience >= nlFilters.minExperience);
    if (nlFilters.role) results = results.filter(p => p.role.toLowerCase().includes(nlFilters.role.toLowerCase()));
    if (nlFilters.minRating) results = results.filter(p => p.rating >= nlFilters.minRating);
  }

  // Basic Filters
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(p => 
      p.name.toLowerCase().includes(s) || 
      p.role.toLowerCase().includes(s) || 
      p.skills.some(sk => sk.toLowerCase().includes(s))
    );
  }
  if (role) results = results.filter(p => p.role.toLowerCase().includes(role.toLowerCase()));
  if (available !== undefined && available !== '') results = results.filter(p => p.available === (available === 'true'));
  if (location) results = results.filter(p => p.location.toLowerCase().includes(location.toLowerCase()));
  if (skills) {
    const skillList = skills.split(',').map(s => s.trim().toLowerCase());
    results = results.filter(p => skillList.every(s => p.skills.map(sk => sk.toLowerCase()).includes(s)));
  }
  if (minExperience) results = results.filter(p => p.experience >= parseInt(minExperience));
  if (minRating) results = results.filter(p => p.rating >= parseFloat(minRating));

  // Sorting
  if (sortBy) {
    const order = sortOrder === 'desc' ? -1 : 1;
    results.sort((a, b) => {
      if (typeof a[sortBy] === 'string') return order * a[sortBy].localeCompare(b[sortBy]);
      return order * (a[sortBy] - b[sortBy]);
    });
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const total = results.length;
  const totalPages = Math.ceil(total / limitNum);
  const offset = (pageNum - 1) * limitNum;
  const paginated = results.slice(offset, offset + limitNum);

  // Updated Pagination Shape (Stage 3)
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;
  const getPageUrl = (p) => `${baseUrl}?page=${p}&limit=${limitNum}`;

  res.json({
    items: paginated,
    meta: {
      totalItems: total,
      itemCount: paginated.length,
      itemsPerPage: limitNum,
      totalPages,
      currentPage: pageNum
    },
    links: {
      first: getPageUrl(1),
      previous: pageNum > 1 ? getPageUrl(pageNum - 1) : null,
      next: pageNum < totalPages ? getPageUrl(pageNum + 1) : null,
      last: getPageUrl(totalPages)
    }
  });
}

function exportProfiles(req, res) {
  // Admin only logic should be in middleware, but double check here if needed
  const header = 'id,name,role,location,skills,experience,available,rating\n';
  const rows = profiles.map(p =>
    `${p.id},"${p.name}","${p.role}","${p.location}","${p.skills.join(';')}",${p.experience},${p.available},${p.rating}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="profiles.csv"');
  res.send(header + rows);
}

function getProfileById(req, res) {
  const profile = profiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ data: profile });
}

// User management (Admin only)
function getUsers(req, res) {
  const allUsers = [...users.values()];
  res.json({ data: allUsers, total: allUsers.length });
}

function updateUserRole(req, res) {
  const { userId } = req.params;
  const { role } = req.body;
  if (!['admin', 'analyst'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.role = role;
  users.set(userId, user);
  res.json({ message: 'Role updated', user });
}

module.exports = { getProfiles, getProfileById, exportProfiles, getUsers, updateUserRole };