import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonRouterOutlet } from '@ionic/angular';
import { filter, Subscription } from 'rxjs';
import { ApiService } from '../../services/api';
import { addIcons } from 'ionicons';
import {
  browsersOutline, homeOutline, copyOutline, bedOutline, hammerOutline, clipboardOutline, peopleOutline,
  readerOutline, newspaperOutline, cardOutline, trendingUpOutline, trendingDownOutline, cashOutline, statsChartOutline,
  chatbubbleEllipsesOutline, notificationsOutline, personCircleOutline, chevronBackOutline, chevronForwardOutline
} from 'ionicons/icons';

addIcons({
  browsersOutline, homeOutline, copyOutline, bedOutline, hammerOutline, clipboardOutline, peopleOutline,
  readerOutline, newspaperOutline, cardOutline, trendingUpOutline, trendingDownOutline, cashOutline, statsChartOutline,
  chatbubbleEllipsesOutline, notificationsOutline, personCircleOutline, chevronBackOutline, chevronForwardOutline
});

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

interface NavSection {
  title: string;
  icon: string;
  items: NavItem[];
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, IonRouterOutlet, IonIcon]
})
export class LayoutPage implements OnInit, OnDestroy {

  sidebarOpen = true;
  expandedSection = 'UTAMA';

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
    }
  }

  selectedProperty = 'all';
  unreadNotifications = 0;
  private notificationRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private routerSubscription?: Subscription;

  user = {
    name: '',
    email: ''
  };

  constructor(private api: ApiService, private router: Router) { }

  ngOnInit() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.user = {
          name: user.nama || user.name || '',
          email: user.email || ''
        };
      } catch (error) {
        console.warn('Data user lokal tidak dapat dibaca:', error);
      }
    }

    this.expandSectionForCurrentRoute();
    this.loadUnreadNotifications();
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadUnreadNotifications();
        this.expandSectionForCurrentRoute();
      });

    // Perbarui badge secara berkala agar notifikasi baru tetap terlihat.
    this.notificationRefreshTimer = window.setInterval(
      () => this.loadUnreadNotifications(),
      30000
    );
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    if (this.notificationRefreshTimer !== null) {
      window.clearInterval(this.notificationRefreshTimer);
      this.notificationRefreshTimer = null;
    }
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loadUnreadNotifications();
  }

  loadUnreadNotifications(): void {
    this.api.getUnreadNotificationCount().subscribe({
      next: response => {
        this.unreadNotifications = Number(response?.unread || 0);
      },
      error: error => {
        console.warn('Jumlah notifikasi owner gagal dimuat:', error);
      }
    });
  }

  navSections: NavSection[] = [
    {
      title: 'UTAMA',
      icon: 'browsers-outline',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'browsers-outline', route: '/owner/dashboard' }
      ]
    },
    {
      title: 'MANAJEMEN PROPERTI',
      icon: 'home-outline',
      items: [
        { id: 'properties', label: 'Kos', icon: 'home-outline', route: '/owner/properties' },
        { id: 'room-types', label: 'Tipe Kamar', icon: 'copy-outline', route: '/owner/room-types' },
        { id: 'rooms', label: 'Kamar', icon: 'bed-outline', route: '/owner/rooms' },
        { id: 'facilities', label: 'Fasilitas', icon: 'hammer-outline', route: '/owner/facilities' }
      ]
    },
    {
      title: 'MANAJEMEN PENGHUNI',
      icon: 'people-outline',
      items: [
        { id: 'registrations', label: 'Pendaftaran', icon: 'clipboard-outline', route: '/owner/registrations' },
        { id: 'tenants', label: 'Penghuni', icon: 'people-outline', route: '/owner/tenants' },
        { id: 'contracts', label: 'Kontrak', icon: 'reader-outline', route: '/owner/contracts' }
      ]
    },
    {
      title: 'KEUANGAN',
      icon: 'cash-outline',
      items: [
        { id: 'billing', label: 'Tagihan', icon: 'newspaper-outline', route: '/owner/billing' },
        { id: 'payments', label: 'Pembayaran', icon: 'card-outline', route: '/owner/payments' },
        { id: 'income', label: 'Pendapatan', icon: 'trending-up-outline', route: '/owner/income' },
        { id: 'expenses', label: 'Pengeluaran', icon: 'trending-down-outline', route: '/owner/expenses' },
        { id: 'investments', label: 'Investasi', icon: 'cash-outline', route: '/owner/investments' },
        { id: 'financial-analysis', label: 'Analisis Keuangan', icon: 'stats-chart-outline', route: '/owner/financial-analysis' }
      ]
    },
    {
      title: 'LAYANAN',
      icon: 'chatbubble-ellipses-outline',
      items: [
        { id: 'complaints', label: 'Komplain', icon: 'chatbubble-ellipses-outline', route: '/owner/complaints' },
        { id: 'notifications', label: 'Notifikasi', icon: 'notifications-outline', route: '/owner/notifications' }
      ]
    },
    {
      title: 'AKUN',
      icon: 'person-circle-outline',
      items: [
        { id: 'profile', label: 'Profil', icon: 'person-circle-outline', route: '/owner/profile' }
      ]
    }
  ];

  toggleSection(section: NavSection): void {
    // Pada sidebar yang sedang diperkecil, klik ikon akan membuka sidebar
    // sekaligus membuka kelompok menu yang dipilih.
    if (!this.sidebarOpen) {
      this.sidebarOpen = true;
      this.expandedSection = section.title;
      return;
    }

    this.expandedSection = this.expandedSection === section.title ? '' : section.title;
  }

  isSectionExpanded(section: NavSection): boolean {
    return this.expandedSection === section.title;
  }

  onNavItemClick(): void {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
    }
  }

  private expandSectionForCurrentRoute(): void {
    const currentUrl = (this.router.url || '').split('?')[0].split('#')[0];
    const matchingSection = this.navSections.find(section =>
      section.items.some(item =>
        currentUrl === item.route || currentUrl.startsWith(`${item.route}/`)
      )
    );

    if (matchingSection) {
      this.expandedSection = matchingSection.title;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    console.log('Logout');
  }

  selectProperty(): void {
    console.log('Selected property:', this.selectedProperty);
  }
}
