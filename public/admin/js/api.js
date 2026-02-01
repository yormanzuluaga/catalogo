const API_URL = 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('adminToken');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('adminToken', token);
    }

    getToken() {
        return this.token || localStorage.getItem('adminToken');
    }

    removeToken() {
        this.token = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.getToken()) {
            headers['Authorization'] = `Bearer ${this.getToken()}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || data.msj || 'Error en la petición');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async login(email, password) {
        const data = await this.request('/auth/signIn', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user));
        }

        return data;
    }

    logout() {
        this.removeToken();
        window.location.href = 'login.html';
    }

    // Categories
    async getCategories() {
        return this.request('/category');
    }

    async createCategory(categoryData) {
        return this.request('/category', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });
    }

    // Crear categoría con archivo de imagen
    async createCategoryWithFile(formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/category`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al crear categoría');
        }
        return data;
    }

    async updateCategory(id, categoryData) {
        return this.request(`/category/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData)
        });
    }

    // Actualizar categoría con archivo de imagen
    async updateCategoryWithFile(id, formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/category/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al actualizar categoría');
        }
        return data;
    }

    async deleteCategory(id) {
        return this.request(`/category/${id}`, {
            method: 'DELETE'
        });
    }

    // Subcategories
    async getSubcategories() {
        return this.request('/subcategory');
    }

    async createSubcategory(subcategoryData) {
        return this.request('/subcategory', {
            method: 'POST',
            body: JSON.stringify(subcategoryData)
        });
    }

    // Crear subcategoría con archivo de imagen
    async createSubcategoryWithFile(formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/subcategory`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al crear subcategoría');
        }
        return data;
    }

    async updateSubcategory(id, subcategoryData) {
        return this.request(`/subcategory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(subcategoryData)
        });
    }

    // Actualizar subcategoría con archivo de imagen
    async updateSubcategoryWithFile(id, formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/subcategory/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al actualizar subcategoría');
        }
        return data;
    }

    async deleteSubcategory(id) {
        return this.request(`/subcategory/${id}`, {
            method: 'DELETE'
        });
    }

    // Brands
    async getBrands() {
        return this.request('/brands');
    }

    async createBrand(brandData) {
        return this.request('/brands', {
            method: 'POST',
            body: JSON.stringify(brandData)
        });
    }

    // Crear marca con archivo de logo
    async createBrandWithFile(formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/brands`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al crear marca');
        }
        return data;
    }

    async updateBrand(id, brandData) {
        return this.request(`/brands/${id}`, {
            method: 'PUT',
            body: JSON.stringify(brandData)
        });
    }

    // Actualizar marca con archivo de logo
    async updateBrandWithFile(id, formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/brands/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al actualizar marca');
        }
        return data;
    }

    async deleteBrand(id) {
        return this.request(`/brands/${id}`, {
            method: 'DELETE'
        });
    }

    // Products
    async getProducts() {
        // La ruta espera un ID, pero podemos usar un placeholder o la ruta mixed
        return this.request('/products/all/mixed');
    }

    async getProduct(id) {
        return this.request(`/products/one/${id}`);
    }

    async createProduct(productData) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    // Crear producto con archivos de imagen
    async createProductWithFiles(formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // No incluir Content-Type para que el navegador lo establezca automáticamente con boundary
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al crear producto');
        }
        return data;
    }

    async updateProduct(id, productData) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    async deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    // Banners
    async getBanners() {
        return this.request('/banners');
    }

    async createBanner(formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/banners/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al crear banner');
        }
        return data;
    }

    async updateBanner(id, bannerData) {
        return this.request(`/banners/${id}`, {
            method: 'PUT',
            body: JSON.stringify(bannerData)
        });
    }

    // Actualizar banner con archivo de imagen
    async updateBannerWithFile(id, formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/banners/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al actualizar banner');
        }
        return data;
    }

    async deleteBanner(id) {
        return this.request(`/banners/${id}`, {
            method: 'DELETE'
        });
    }

    // Filters (Filtros por categoría)
    async getFilters(categoryId = null) {
        const params = categoryId ? `?category=${categoryId}` : '';
        return this.request(`/filters${params}`);
    }

    async getFiltersByCategory(categoryId) {
        return this.request(`/filters/category/${categoryId}`);
    }

    async getFilter(id) {
        return this.request(`/filters/${id}`);
    }

    async createFilter(filterData) {
        return this.request('/filters', {
            method: 'POST',
            body: JSON.stringify(filterData)
        });
    }

    async updateFilter(id, filterData) {
        return this.request(`/filters/${id}`, {
            method: 'PUT',
            body: JSON.stringify(filterData)
        });
    }

    async deleteFilter(id) {
        return this.request(`/filters/${id}`, {
            method: 'DELETE'
        });
    }

    async activateFilter(id) {
        return this.request(`/filters/${id}/activate`, {
            method: 'PATCH'
        });
    }

    async getFilterStats() {
        return this.request('/filters/stats');
    }

    // Transactions
    async getTransactions() {
        return this.request('/transactions-v2');
    }

    async getTransaction(id) {
        return this.request(`/transactions-v2/${id}`);
    }

    // Orders (API V2)
    async getOrders() {
        return this.request('/shipping-orders-v2/admin/all-orders');
    }

    async getOrder(id) {
        return this.request(`/shipping-orders-v2/${id}`);
    }

    async updateOrderStatus(id, status, notes) {
        return this.request(`/shipping-orders-v2/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes })
        });
    }

    // Upload Images
    async uploadImage(file, collection, id) {
        const formData = new FormData();
        formData.append('archivo', file);

        const token = this.getToken();
        const response = await fetch(`${API_URL}/uploads/${collection}/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al subir imagen');
        }
        return data;
    }

    // User methods
    async getUsers() {
        return this.request('/user');
    }

    async getUser(id) {
        return this.request(`/user/${id}`);
    }

    async createUser(userData) {
        return this.request('/user', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(id, userData) {
        return this.request(`/user/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // Actualizar usuario con archivo de avatar
    async updateUserWithFile(id, formData) {
        const token = this.getToken();
        const response = await fetch(`${API_URL}/user/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.msg || data.msj || 'Error al actualizar usuario');
        }
        return data;
    }

    async deleteUser(id) {
        return this.request(`/user/${id}`, {
            method: 'DELETE'
        });
    }
}

// Utility Functions
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} show`;
    alertDiv.textContent = message;

    const container = document.querySelector('.main-content') || document.body;
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.toggle('show', show);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const userRole = user.rol || user.role;

    if (!token || userRole !== 'ADMIN_ROLE') {
        window.location.href = '/admin/login.html';
        return false;
    }

    return true;
}

function handleLogout(event) {
    if (event) {
        event.preventDefault();
    }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin/login.html';
}

function initSidebar() {
    const currentPage = window.location.pathname.split('/').pop();
    const menuLinks = document.querySelectorAll('.sidebar-menu a');

    menuLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// Export for use in other files
const api = new ApiService();
