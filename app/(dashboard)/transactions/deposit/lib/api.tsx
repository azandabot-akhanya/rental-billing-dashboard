export async function fetchCompanies() {
    const res = await fetch(getApiUrl("companies"))
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error("Failed to fetch companies")
    return data
  }
  
  export async function fetchTenants(companyId: string) {
    const res = await fetch(getApiUrl(`companies/tenants?company_id=${companyId}`))
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error("Failed to fetch tenants")
    return data
  }
  