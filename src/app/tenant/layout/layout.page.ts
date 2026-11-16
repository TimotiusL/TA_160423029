import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../services/api';
import { IonHeader, IonToolbar, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-tenant-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IonHeader, IonToolbar, IonRouterOutlet],
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantLayoutPage implements OnInit {
  nama = 'Penghuni';
  email = '';
  notifCount = 0;
  showMoreMenu = false;

  constructor(private router: Router, private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.showMoreMenu = false;
        this.loadNotificationCount();
        this.cdr.markForCheck();
      });
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;

    try {
      const user = JSON.parse(savedUser);
      this.nama = user.nama || user.name || 'Penghuni';
      this.email = user.email || '';
    } catch {
      this.nama = 'Penghuni';
    }
  }


  private loadNotificationCount(): void {
    this.api.getTenantNotifikasiCount().subscribe({
      next: (response: any) => {
        this.notifCount = Math.max(0, Number(response?.unread || 0));
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.warn('Gagal memuat jumlah notifikasi:', error);
        this.notifCount = 0;
        this.cdr.markForCheck();
      }
    });
  }

  toggleMoreMenu(): void {
    this.showMoreMenu = !this.showMoreMenu;
    this.cdr.markForCheck();
  }

  closeMoreMenu(): void {
    this.showMoreMenu = false;
    this.cdr.markForCheck();
  }

  logout(): void {
    if (confirm('Apakah kamu yakin ingin keluar?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigateByUrl('/login', { replaceUrl: true });
      this.cdr.markForCheck();
    }
  }
}
