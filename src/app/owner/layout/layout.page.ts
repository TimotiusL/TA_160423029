import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  browsersOutline, homeOutline, copyOutline, bedOutline, hammerOutline, clipboardOutline, cartOutline, peopleOutline,
  readerOutline, newspaperOutline, cardOutline, trendingUpOutline, trendingDownOutline, cashOutline, statsChartOutline,
  chatbubbleEllipsesOutline, notificationsOutline, personCircleOutline, logOutOutline, chevronBackOutline, chevronForwardOutline
} from 'ionicons/icons';

addIcons({
  browsersOutline, homeOutline, copyOutline, bedOutline, hammerOutline, clipboardOutline, cartOutline, peopleOutline,
  readerOutline, newspaperOutline, cardOutline, trendingUpOutline, trendingDownOutline, cashOutline, statsChartOutline,
  chatbubbleEllipsesOutline, notificationsOutline, personCircleOutline, logOutOutline, chevronBackOutline, chevronForwardOutline
});

interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, IonRouterOutlet, IonIcon]
})

export class LayoutPage {

  sidebarOpen = true;

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
    }
  }

  selectedProperty = 'all';

  user = {
    name: '',
    email: ''
  };

  constructor() { }

  ngOnInit() {
    if (window.innerWidth <= 768) {
      this.sidebarOpen = false;
    }
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      const user = JSON.parse(savedUser);

      this.user = {
        name: user.nama || user.name || '',
        email: user.email || ''
      };
    }
  }

  properties = [
    {
      id: 'all',
      name: 'Semua Kos'
    },
    {
      id: 'kos1',
      name: 'Kost Griya 21'
    },
    {
      id: 'kos2',
      name: 'Kost Harmoni'
    },
    {
      id: 'kos3',
      name: 'Kost Melati'
    }
  ];

  navSections: NavSection[] = [

    {
      title: 'UTAMA',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'browsers-outline',
          route: '/owner/dashboard'
        }
      ]
    },

    {
      title: 'MANAJEMEN PROPERTI',
      items: [
        {
          id: 'properties',
          label: 'Boarding House',
          icon: 'home-outline',
          route: '/owner/properties'
        },
        {
          id: 'room-types',
          label: 'Tipe Kamar',
          icon: 'copy-outline',
          route: '/owner/room-types'
        },
        {
          id: 'rooms',
          label: 'Kamar',
          icon: 'bed-outline',
          route: '/owner/rooms'
        },
        {
          id: 'facilities',
          label: 'Fasilitas',
          icon: 'hammer-outline',
          route: '/owner/facilities'
        }
      ]
    },

    {
      title: 'MANAJEMEN PENGHUNI',
      items: [
        {
          id: 'registrations',
          label: 'Pendaftaran',
          icon: 'clipboard-outline',
          route: '/owner/registrations'
        },
        {
          id: 'tenants',
          label: 'Penghuni',
          icon: 'people-outline',
          route: '/owner/tenants'
        },
        {
          id: 'contracts',
          label: 'Kontrak',
          icon: 'reader-outline',
          route: '/owner/contracts'
        }
      ]
    },

    {
      title: 'KEUANGAN',
      items: [
        {
          id: 'billing',
          label: 'Tagihan',
          icon: 'newspaper-outline',
          route: '/owner/billing'
        },
        {
          id: 'payments',
          label: 'Pembayaran',
          icon: 'card-outline',
          route: '/owner/payments'
        },
        {
          id: 'income',
          label: 'Pendapatan',
          icon: 'trending-up-outline',
          route: '/owner/income'
        },
        {
          id: 'expenses',
          label: 'Pengeluaran',
          icon: 'trending-down-outline',
          route: '/owner/expenses'
        },
        {
          id: 'investments',
          label: 'Investasi',
          icon: 'cash-outline',
          route: '/owner/investments'
        },
        {
          id: 'financial-analysis',
          label: 'Analisis Keuangan',
          icon: 'stats-chart-outline',
          route: '/owner/financial-analysis'
        }
      ]
    },

    {
      title: 'LAYANAN',
      items: [
        {
          id: 'complaints',
          label: 'Komplain',
          icon: 'chatbubble-ellipses-outline',
          route: '/owner/complaints'
        },
        {
          id: 'notifications',
          label: 'Notifikasi',
          icon: 'notifications-outline',
          route: '/owner/notifications'
        }
      ]
    },

    {
      title: 'AKUN',
      items: [
        {
          id: 'profile',
          label: 'Profil',
          icon: 'person-circle-outline',
          route: '/owner/profile'
        }
      ]
    }

  ];


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