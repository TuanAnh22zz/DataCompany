console.log('✅ app.js loaded');

const industryInput = document.getElementById('industryInput');
const generateBtn = document.getElementById('generateBtn');
const loadingEl = document.getElementById('loading');
const summaryEl = document.getElementById('summary');
const companiesTableEl = document.getElementById('companiesTable');
const employeesTableEl = document.getElementById('employeesTable');

console.log('DOM elements:', {
  industryInput,
  generateBtn,
  loadingEl,
  summaryEl,
  companiesTableEl,
  employeesTableEl,
});

if (!generateBtn) {
  console.error('❌ Không tìm thấy generateBtn');
}

generateBtn?.addEventListener('click', async () => {
  console.log('🔥 Generate button clicked');

  const industry = industryInput?.value?.trim();
  console.log('industry =', industry);

  if (!industry) {
    alert('Vui lòng nhập ngành');
    return;
  }

  loadingEl?.classList.remove('hidden');

  if (summaryEl) summaryEl.innerHTML = '';
  if (companiesTableEl) companiesTableEl.innerHTML = '';
  if (employeesTableEl) employeesTableEl.innerHTML = '';

  try {
    console.log('📡 Calling API /api/generate-leads ...');

    const response = await fetch('/api/generate-leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ industry ,
        
        limit: 5,
      }),
    });

    console.log('response status =', response.status);

    const data = await response.json();
    console.log('response data =', data);

    if (!data.success) {
      alert(data.message || 'Có lỗi xảy ra');
      return;
    }

    renderSummary(data);
    renderCompanies(data.companies || []);
    renderEmployees(data.employees || []);
  } catch (error) {
    console.error('❌ fetch error:', error);
    alert('Không gọi được API');
  } finally {
    loadingEl?.classList.add('hidden');
  }
});

function renderSummary(data) {
  if (!summaryEl) return;

  summaryEl.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Industry</span>
      <div class="summary-value">${data.industry || ''}</div>
    </div>
    <div class="summary-card">
      <span class="summary-label">Total Companies</span>
      <div class="summary-value">${data.totalCompanies || 0}</div>
    </div>
    <div class="summary-card">
      <span class="summary-label">Total Employees</span>
      <div class="summary-value">${data.totalEmployees || 0}</div>
    </div>
  `;
}

function renderCompanies(companies) {
  if (!companiesTableEl) return;

  if (!companies.length) {
    companiesTableEl.innerHTML =
      '<div class="empty-state">Không có company nào.</div>';
    return;
  }

  const rows = companies
    .map(
      (company, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(company.name || '')}</strong></td>
        <td><span class="badge">${escapeHtml(company.industry || '')}</span></td>
        <td>${escapeHtml(company.location || '')}</td>
        <td>${company.employeeCount || ''}</td>
        <td>${
          company.website
            ? `<a href="${company.website}" target="_blank" rel="noopener noreferrer">${escapeHtml(company.website)}</a>`
            : ''
        }</td>
        <td>${
          company.linkedinUrl
            ? `<a href="${company.linkedinUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(company.linkedinUrl)}</a>`
            : ''
        }</td>
        <td class="email-cell">${escapeHtml(company.contactEmail || '')}</td>
        <td class="phone-cell">${escapeHtml(company.contactPhone || '')}</td>
        <td>${
          company.contactPage
            ? `<a href="${company.contactPage}" target="_blank" rel="noopener noreferrer">Contact</a>`
            : ''
        }</td>
        <td>${
          company.teamPage
            ? `<a href="${company.teamPage}" target="_blank" rel="noopener noreferrer">Team/About</a>`
            : ''
        }</td>
      </tr>
    `
    )
    .join('');

  companiesTableEl.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Industry</th>
            <th>Location</th>
            <th>Employee Count</th>
            <th>Website</th>
            <th>LinkedIn</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Contact Page</th>
            <th>Team/About</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderEmployees(employees) {
  if (!employeesTableEl) return;

  if (!employees.length) {
    employeesTableEl.innerHTML =
      '<div class="empty-state">Chưa có employee public.</div>';
    return;
  }

  const rows = employees
    .map(
      (employee, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(employee.companyName || '')}</strong></td>
        <td>${escapeHtml(employee.name || '')}</td>
        <td>${escapeHtml(employee.title || '')}</td>
        <td>${escapeHtml(employee.location || '')}</td>
        <td>${
          employee.linkedinUrl
            ? `<a href="${employee.linkedinUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(employee.linkedinUrl)}</a>`
            : ''
        }</td>
        <td>${
          employee.sourceUrl
            ? `<a href="${employee.sourceUrl}" target="_blank" rel="noopener noreferrer">Source</a>`
            : ''
        }</td>
      </tr>
    `
    )
    .join('');

  employeesTableEl.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Company</th>
            <th>Name</th>
            <th>Title</th>
            <th>Location</th>
            <th>LinkedIn</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}