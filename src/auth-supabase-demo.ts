import { dwvSupabaseAuthService } from './services/dwvSupabaseAuthService';

// UI Elements
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const loginSection = document.getElementById('login-section');
const authStatus = document.getElementById('auth-status');
const authError = document.getElementById('auth-error');
const authMessage = document.getElementById('auth-message');
const authErrorMessage = document.getElementById('auth-error-message');
const fetchSection = document.getElementById('fetch-section');
const fetchDisabled = document.getElementById('fetch-disabled');
const propertiesSection = document.getElementById('properties-section');
const propertiesList = document.getElementById('properties-list');
const totalProperties = document.getElementById('total-properties');
const dataSource = document.getElementById('data-source');
const authMethod = document.getElementById('auth-method');
const fetchError = document.getElementById('fetch-error');
const fetchErrorMessage = document.getElementById('fetch-error-message');
const loading = document.getElementById('loading');
const debugInfo = document.getElementById('debug-info');
const logoutButton = document.getElementById('logout-button');
const fetchPropertiesButton = document.getElementById('fetch-properties-button') as HTMLButtonElement;

// Debug logging with enhanced error details
function log(message: string, data: any = null) {
    console.log(message, data);
    const timestamp = new Date().toLocaleTimeString();
    let logEntry = `[${timestamp}] ${message}`;
    
    if (data) {
        if (data instanceof Error) {
            logEntry += `\nError: ${data.message}\nStack: ${data.stack}`;
        } else {
            logEntry += '\n' + JSON.stringify(data, null, 2);
        }
    }
    
    if (debugInfo) {
        debugInfo.innerHTML = `<pre>${logEntry}</pre>\n` + debugInfo.innerHTML;
    }
}

// Add network monitoring
log('🌐 Network monitoring started');
log('📍 Supabase URL: ' + import.meta.env.VITE_SUPABASE_URL);
log('🔑 Anon Key present: ' + (!!import.meta.env.VITE_SUPABASE_ANON_KEY));

// Check initial authentication status
function checkAuthStatus() {
    log('🔍 Checking authentication status...');
    
    if (dwvSupabaseAuthService.isAuthenticated()) {
        log('✅ Found existing session');
        showAuthenticatedState();
        
        // Check if we have auto-fetched properties from login
        const autoFetchedData = sessionStorage.getItem('auto_fetched_properties');
        if (autoFetchedData) {
            try {
                const propertiesData = JSON.parse(autoFetchedData);
                log('🏠 Found auto-fetched properties from login:', propertiesData);
                displayProperties(propertiesData);
                // Clear the session storage after displaying
                sessionStorage.removeItem('auto_fetched_properties');
            } catch (e) {
                log('❌ Failed to parse auto-fetched properties:', e);
            }
        }
    } else {
        log('❌ No existing session found');
    }
}

// Show authenticated state
function showAuthenticatedState() {
    if (loginSection) loginSection.classList.add('hidden');
    if (authStatus) authStatus.classList.remove('hidden');
    if (authError) authError.classList.add('hidden');
    if (fetchSection) fetchSection.classList.remove('hidden');
    if (fetchDisabled) fetchDisabled.classList.add('hidden');
    
    const session = dwvSupabaseAuthService.getSession();
    if (session && authMessage) {
        authMessage.textContent = `Session ID: ${session.sessionId} | Expires: ${new Date(session.expires).toLocaleString()}`;
    }
}

// Show login state
function showLoginState() {
    if (loginSection) loginSection.classList.remove('hidden');
    if (authStatus) authStatus.classList.add('hidden');
    if (authError) authError.classList.add('hidden');
    if (fetchSection) fetchSection.classList.add('hidden');
    if (fetchDisabled) fetchDisabled.classList.remove('hidden');
    if (propertiesSection) propertiesSection.classList.add('hidden');
    if (fetchError) fetchError.classList.add('hidden');
}

// Handle login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const loginButton = document.getElementById('login-button') as HTMLButtonElement;
        
        log(`🔐 Attempting login for: ${email}`);
        log('🔧 Environment check:', {
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
        });
        
        // Show loading state
        loginButton.disabled = true;
        loginButton.textContent = 'Authenticating...';
        if (authError) authError.classList.add('hidden');
        
        try {
            // Add timeout wrapper
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
            );
            
            const authPromise = dwvSupabaseAuthService.authenticate(email, password, true);
            
            // Race between auth and timeout
            const result = await Promise.race([authPromise, timeoutPromise]) as any;
            
            log('📦 Authentication result:', result);
            
            if (result.success) {
                showAuthenticatedState();
                
                // If properties were auto-fetched, display them
                if (result.propertiesData) {
                    log('🏠 Auto-fetched properties:', result.propertiesData);
                    displayProperties(result.propertiesData);
                }
            } else {
                if (authError) authError.classList.remove('hidden');
                if (authErrorMessage) authErrorMessage.textContent = result.message;
            }
        } catch (error) {
            log('💥 Authentication error:', error);
            if (authError) authError.classList.remove('hidden');
            if (authErrorMessage) {
                authErrorMessage.textContent = error instanceof Error ? error.message : 'Unknown error occurred';
            }
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Login via Supabase Edge Function';
        }
    });
}

// Handle logout
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        log('🚪 Logging out...');
        dwvSupabaseAuthService.logout();
        showLoginState();
    });
}

// Function to display properties
function displayProperties(result: any) {
    if (result.success) {
        // Update summary
        if (totalProperties) totalProperties.textContent = result.total_found.toString();
        if (dataSource) dataSource.textContent = result.source;
        if (authMethod) authMethod.textContent = result.auth_method;
        
        // Display properties
        if (propertiesList) {
            propertiesList.innerHTML = '';
            result.properties.forEach((property: any, index: number) => {
                const propertyCard = document.createElement('div');
                propertyCard.className = 'bg-white border border-gray-200 rounded-lg p-4';
                propertyCard.innerHTML = `
                    <h4 class="font-semibold text-lg mb-2">Property ${index + 1}</h4>
                    <div class="text-sm text-gray-600">
                        <p><strong>ID:</strong> ${property.id || 'N/A'}</p>
                        <p><strong>Title:</strong> ${property.title || 'N/A'}</p>
                        <p><strong>Price:</strong> ${property.price || 'N/A'}</p>
                        <p><strong>Location:</strong> ${property.location || 'N/A'}</p>
                        <p><strong>Type:</strong> ${property.type || 'N/A'}</p>
                        <p><strong>Area:</strong> ${property.area || 'N/A'}</p>
                    </div>
                `;
                propertiesList.appendChild(propertyCard);
            });
        }
        
        if (propertiesSection) propertiesSection.classList.remove('hidden');
    } else {
        if (fetchError) fetchError.classList.remove('hidden');
        if (fetchErrorMessage) fetchErrorMessage.textContent = result.message;
    }
}

// Handle fetch properties
if (fetchPropertiesButton) {
    fetchPropertiesButton.addEventListener('click', async () => {
        log('🏠 Fetching properties...');
        
        if (loading) loading.classList.remove('hidden');
        if (propertiesSection) propertiesSection.classList.add('hidden');
        if (fetchError) fetchError.classList.add('hidden');
        fetchPropertiesButton.disabled = true;
        
        try {
            const result = await dwvSupabaseAuthService.fetchProperties();
            log('📦 Properties result:', result);
            displayProperties(result);
        } catch (error) {
            log('💥 Fetch error:', error);
            if (fetchError) fetchError.classList.remove('hidden');
            if (fetchErrorMessage) {
                fetchErrorMessage.textContent = error instanceof Error ? error.message : 'Unknown error occurred';
            }
        } finally {
            if (loading) loading.classList.add('hidden');
            fetchPropertiesButton.disabled = false;
        }
    });
}

// Initialize
log('🚀 DWV Supabase Demo initialized');
checkAuthStatus();