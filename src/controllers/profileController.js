const profiles = require('../data/profiles');

// ── Natural Language Parser ───────────────────────────────────────────────────
function parseNaturalLanguage(query) {
  const filters = {};
  const q = query.toLowerCase();

  // Available/unavailable
  if (q.includes('available')) filters.available = true;
  if (q.includes('unavailable') || q.includes('not available')) filters.available = false;

  // Skills
  const skillKeywords = [
    'react', 'node', 'python', 'javascript', 'typescript', 'go', 'java',
    'docker', 'kubernetes', 'aws', 'postgresql', 'mongodb', 'redis',
    'flutter', 'swift', 'kotlin', 'tensorflow', 'pytorch', 'sql',
  ];
  const foundSkills = skillKeywords.filter(skill => q.includes(skill));
  if (foundSkills.length > 0) filters.skills = foundSkills;

  // Experience
  const expMatch = q.match(/(\d+)\+?\s*years?/);
  if (expMatch) filters.minExperience = parseInt(expMatch[1]);

  // Roles
  const roleKeywords = [
    'frontend', 'backend', 'full stack', 'fullstack', 'devops',
    'mobile', 'data scientist', 'ml engineer', 'data engineer',
    'security', 'product engineer',
  ];
  const roleMap = {
    'frontend': 'Frontend Engineer',
    'backend': 'Backend Engineer',
    'full stack': 'Full Stack Engineer',
    'fullstack': 'Full Stack Engineer',
    'devops': 'DevOps Engineer',
    'mobile': 'Mobile Developer',
    'data scientist': 'Data Scientist',
    'ml engineer': 'ML Engineer',
    'data engineer': 'Data Engineer',
    'security': 'Security Engineer',
    'product engineer': 'Product Engineer',
  };
  for (const keyword of roleKeywords) {
    if (q.includes(keyword)) {
      filters.role = roleMap[keyword];
      break;
    }
  }

  // Location
  const cities = ['lagos', 'abuja', 'kano', 'enugu', 'ibadan', 'port harcourt', 'accra', 'dakar', 'kaduna'];
  for (const city of cities) {
    if (q.includes(city)) {
      filters.location = city;
      break;
    }
  }

  // Rating
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
    naturalLanguage, export: exportFormat,
  } = req.query;

  // Natural language search
  if (naturalLanguage) {
    const nlFilters = parseNaturalLanguage(naturalLanguage);
    if (nlFilters.available !== undefined) {
      results = results.filter(p => p.available === nlFilters.available);
    }
    if (nlFilters.skills) {
      results = results.filter(p =>
        nlFilters.skills.some(s => p.skills.map(sk => sk.toLowerCase()).includes(s))
      );
    }
    if (nlFilters.minExperience) {
      results = results.filter(p => p.experience >= nlFilters.minExperience);
    }
    if (nlFilters.role) {
      results = results.filter(p => p.role.toLowerCase().includes(nlFilters.role.toLowerCase()));
    }
    if (nlFilters.location) {
      results = results.filter(p => p.location.toLowerCase().includes(nlFilters.location));
    }
    if (nlFilters.minRating) {
      results = results.filter(p => p.rating >= nlFilters.minRating);
    }
  }

  // Text search
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.role.toLowerCase().includes(s) ||
      p.bio.toLowerCase().includes(s) ||
      p.skills.some(sk => sk.toLowerCase().includes(s))
    );
  }

  // Filters
  if (role) {
    results = results.filter(p => p.role.toLowerCase().includes(role.toLowerCase()));
  }
  if (available !== undefined && available !== '') {
    const isAvailable = available === 'true';
    results = results.filter(p => p.available === isAvailable);
  }
  if (location) {
    results = results.filter(p => p.location.toLowerCase().includes(location.toLowerCase()));
  }
  if (skills) {
    const skillList = skills.split(',').map(s => s.trim().toLowerCase());
    results = results.filter(p =>
      skillList.every(s => p.skills.map(sk => sk.toLowerCase()).includes(s))
    );
  }
  if (minExperience) {
    results = results.filter(p => p.experience >= parseInt(minExperience));
  }
  if (maxExperience) {
    results = results.filter(p => p.experience <= parseInt(maxExperience));
  }
  if (minRating) {
    results = results.filter(p => p.rating >= parseFloat(minRating));
  }

  // Sorting
  const validSortFields = ['name', 'experience', 'rating', 'role'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : null;
  if (sortField) {
    const order = sortOrder === 'desc' ? -1 : 1;
    results.sort((a, b) => {
      if (typeof a[sortField] === 'string') {
        return order * a[sortField].localeCompare(b[sortField]);
      }
      return order * (a[sortField] - b[sortField]);
    });
  }

  // CSV Export — admin only check is in the route
  if (exportFormat === 'csv') {
    const header = 'id,name,role,location,skills,experience,available,rating\n';
    const rows = results.map(p =>
      `${p.id},"${p.name}","${p.role}","${p.location}","${p.skills.join(';')}",${p.experience},${p.available},${p.rating}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="profiles.csv"');
    return res.send(header + rows);
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const total = results.length;
  const totalPages = Math.ceil(total / limitNum);
  const offset = (pageNum - 1) * limitNum;
  const paginated = results.slice(offset, offset + limitNum);

  res.json({
    data: paginated,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  });
}

function getProfileById(req, res) {
  const profile = profiles.find(p => p.id === req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json({ data: profile });
}

// Admin only — get all users who have logged in
function getUsers(req, res) {
  const { users } = require('../data/store');
  const allUsers = [...users.values()].map(u => ({
    id: u.id,
    name: u.name,
    githubLogin: u.githubLogin,
    role: u.role,
    createdAt: u.createdAt,
  }));
  res.json({ data: allUsers, total: allUsers.length });
}

// Admin only — update a user's role
function updateUserRole(req, res) {
  const { users } = require('../data/store');
  const { userId } = req.params;
  const { role } = req.body;

  if (!['admin', 'analyst'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or analyst' });
  }

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.role = role;
  users.set(userId, user);
  res.json({ message: 'Role updated', user: { id: user.id, role: user.role } });
}

module.exports = { getProfiles, getProfileById, getUsers, updateUserRole };