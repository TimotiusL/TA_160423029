import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {Chart, BarController, BarElement, LineController, LineElement, PointElement, DoughnutController, ArcElement,
        CategoryScale, LinearScale, Tooltip, Legend, Filler} from 'chart.js';

Chart.register(BarController,BarElement,LineController,LineElement,PointElement,DoughnutController,ArcElement,
                CategoryScale,LinearScale,Tooltip,Legend,Filler);

interface Property {
  id: string;
  name: string;
  address: string;
  totalRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  availableRooms: number;
  tenantCount: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

interface Payment {
  id: string;
  tenant: string;
  room: string;
  period: string;
  amount: number;
}

interface Bill {
  number: string;
  tenant: string;
  room: string;
  period: string;
  dueDate: string;
  total: number;
  status: string;
}

interface Activity {
  icon: string;
  text: string;
  time: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DashboardPage
  implements AfterViewInit, OnDestroy {

  @ViewChild('roomStatusChart')
  roomStatusChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('financialChart')
  financialChart!: ElementRef<HTMLCanvasElement>;

  @ViewChild('profitChart')
  profitChart!: ElementRef<HTMLCanvasElement>;

  roomStatusChartInstance?: Chart;
  financialChartInstance?: Chart;
  profitChartInstance?: Chart;

  month = 'September 2026';

  user = {
    name: 'Timotius'
  };

  properties: Property[] = [
    {
      id: 'kos1',
      name: 'Kost Griya 21',
      address: 'Jl. Raya Trawas No. 21, Mojokerto',
      totalRooms: 20,
      occupiedRooms: 15,
      reservedRooms: 2,
      availableRooms: 3,
      tenantCount: 15,
      monthlyIncome: 22500000,
      monthlyExpense: 6500000
    },
    {
      id: 'kos2',
      name: 'Kost Harmoni',
      address: 'Jl. Raya Surabaya No. 10, Surabaya',
      totalRooms: 15,
      occupiedRooms: 11,
      reservedRooms: 1,
      availableRooms: 3,
      tenantCount: 11,
      monthlyIncome: 16500000,
      monthlyExpense: 5200000
    },
    {
      id: 'kos3',
      name: 'Kost Melati',
      address: 'Jl. Melati No. 5, Sidoarjo',
      totalRooms: 12,
      occupiedRooms: 8,
      reservedRooms: 2,
      availableRooms: 2,
      tenantCount: 8,
      monthlyIncome: 12000000,
      monthlyExpense: 3800000
    }
  ];

  monthlyFinancials = [
    {
      month: 'Apr',
      income: 39000000,
      expense: 12000000
    },
    {
      month: 'Mei',
      income: 42000000,
      expense: 13000000
    },
    {
      month: 'Jun',
      income: 44500000,
      expense: 14000000
    },
    {
      month: 'Jul',
      income: 46000000,
      expense: 14500000
    },
    {
      month: 'Agu',
      income: 48000000,
      expense: 15000000
    },
    {
      month: 'Sep',
      income: 51000000,
      expense: 15500000
    }
  ];

  pendingPayments: Payment[] = [
    {
      id: 'pay1',
      tenant: 'Kevin Pratama',
      room: '201',
      period: 'September 2026',
      amount: 1479000
    },
    {
      id: 'pay2',
      tenant: 'Sari Indah',
      room: '104',
      period: 'September 2026',
      amount: 1350000
    }
  ];

  recentActivity: Activity[] = [
    {
      icon: 'clipboard-outline',
      text: 'Rizky Aditya mendaftar kamar 202 Kost Griya 21',
      time: '2 jam lalu'
    },
    {
      icon: 'card-outline',
      text: 'Kevin Pratama mengirim bukti bayar Rp1.479.000',
      time: '4 jam lalu'
    },
    {
      icon: 'checkmark-circle-outline',
      text: 'Pembayaran Andi Wijaya telah diverifikasi',
      time: '1 hari lalu'
    },
    {
      icon: 'chatbubble-ellipses-outline',
      text: 'Sari Indah mengajukan komplain: Kran bocor',
      time: '1 hari lalu'
    },
    {
      icon: 'reader-outline',
      text: 'Kontrak Budi Santoso aktif - KTR-2026-0001',
      time: '2 hari lalu'
    }
  ];

  overdueBills: Bill[] = [
    {
      number: 'INV-2026-0912',
      tenant: 'Budi Santoso',
      room: '101',
      period: 'September 2026',
      dueDate: '2026-09-10',
      total: 1500000,
      status: 'TERLAMBAT'
    },
    {
      number: 'INV-2026-0915',
      tenant: 'Andi Wijaya',
      room: '102',
      period: 'September 2026',
      dueDate: '2026-09-15',
      total: 1400000,
      status: 'BELUM_BAYAR'
    }
  ];

  /* =========================
     SUMMARY
  ========================= */

  get totalRooms(): number {
    return this.properties.reduce(
      (sum, property) =>
        sum + property.totalRooms,
      0
    );
  }

  get totalOccupied(): number {
    return this.properties.reduce(
      (sum, property) =>
        sum + property.occupiedRooms,
      0
    );
  }

  get totalReserved(): number {
    return this.properties.reduce(
      (sum, property) =>
        sum + property.reservedRooms,
      0
    );
  }

  get totalAvailable(): number {
    return this.properties.reduce(
      (sum, property) =>
        sum + property.availableRooms,
      0
    );
  }

  get totalTenants(): number {
    return this.properties.reduce(
      (sum, property) =>
        sum + property.tenantCount,
      0
    );
  }

  get totalIncome(): number {
    return this.properties.reduce(
      (sum, property) =>
        sum + property.monthlyIncome,
      0
    );
  }

  get totalExpense(): number {
    return this.properties.reduce(
      (sum, property) =>
        sum + property.monthlyExpense,
      0
    );
  }

  get totalProfit(): number {
    return this.totalIncome - this.totalExpense;
  }

  get occupancyPercentage(): number {
    if (this.totalRooms === 0) {
      return 0;
    }

    return Math.round(
      (this.totalOccupied /
        this.totalRooms) *
      100
    );
  }

  get profitMargin(): number {
    if (this.totalIncome === 0) {
      return 0;
    }

    return Math.round(
      (this.totalProfit /
        this.totalIncome) *
      100
    );
  }

  /* =========================
     FORMAT
  ========================= */

  formatRupiah(value: number): string {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }
    ).format(value);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    ).format(new Date(date));
  }

  getOccupancy(property: Property): number {
    if (property.totalRooms === 0) {
      return 0;
    }

    return Math.round(
      (property.occupiedRooms /
        property.totalRooms) *
      100
    );
  }

  getProfit(property: Property): number {
    return (
      property.monthlyIncome -
      property.monthlyExpense
    );
  }

  /* =========================
     CHART LIFECYCLE
  ========================= */

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.createCharts();
    });
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private destroyCharts(): void {
    this.roomStatusChartInstance?.destroy();
    this.financialChartInstance?.destroy();
    this.profitChartInstance?.destroy();
  }

  private createCharts(): void {
    if (
      !this.roomStatusChart ||
      !this.financialChart ||
      !this.profitChart
    ) {
      return;
    }

    this.destroyCharts();

    this.createRoomStatusChart();
    this.createFinancialChart();
    this.createProfitChart();
  }

  /* =========================
     STATUS KAMAR
  ========================= */

  private createRoomStatusChart(): void {
    this.roomStatusChartInstance =
      new Chart(
        this.roomStatusChart.nativeElement,
        {
          type: 'doughnut',

          data: {
            labels: [
              'Terisi',
              'Dipesan',
              'Tersedia'
            ],

            datasets: [
              {
                data: [
                  this.totalOccupied,
                  this.totalReserved,
                  this.totalAvailable
                ],

                backgroundColor: [
                  '#0D9488',
                  '#F59E0B',
                  '#E2E8F0'
                ],

                borderWidth: 0
              }
            ]
          },

          options: {
            responsive: true,
            maintainAspectRatio: false,

            cutout: '72%',

            plugins: {
              legend: {
                display: false
              },

              tooltip: {
                backgroundColor: '#0F172A',
                padding: 10,

                callbacks: {
                  label: (context) => {
                    const value =
                      Number(context.raw);

                    return ` ${value} kamar`;
                  }
                }
              }
            }
          }
        }
      );
  }

  /* =========================
     PENDAPATAN VS PENGELUARAN
  ========================= */

  private createFinancialChart(): void {
    this.financialChartInstance =
      new Chart(
        this.financialChart.nativeElement,
        {
          type: 'bar',

          data: {
            labels:
              this.monthlyFinancials.map(
                item => item.month
              ),

            datasets: [
              {
                label: 'Pendapatan',

                data:
                  this.monthlyFinancials.map(
                    item => item.income
                  ),

                backgroundColor: '#0D9488',
                borderRadius: 4,
                barPercentage: 0.65
              },

              {
                label: 'Pengeluaran',

                data:
                  this.monthlyFinancials.map(
                    item => item.expense
                  ),

                backgroundColor: '#F59E0B',
                borderRadius: 4,
                barPercentage: 0.65
              }
            ]
          },

          options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
              legend: {
                display: false
              },

              tooltip: {
                backgroundColor: '#0F172A',
                padding: 10,

                callbacks: {
                  label: (context) =>
                    ` ${this.formatRupiah(
                      Number(context.raw)
                    )}`
                }
              }
            },

            scales: {
              x: {
                grid: {
                  display: false
                },

                ticks: {
                  color: '#94A3B8',
                  font: {
                    size: 11
                  }
                }
              },

              y: {
                beginAtZero: true,

                grid: {
                  color: '#F1F5F9'
                },

                ticks: {
                  color: '#94A3B8',
                  font: {
                    size: 10
                  },

                  callback: (
                    value: string | number
                  ) =>
                    `${Number(value) / 1000000}jt`
                }
              }
            }
          }
        }
      );
  }

  /* =========================
     TREN LABA BERSIH
  ========================= */

  private createProfitChart(): void {
    this.profitChartInstance =
      new Chart(
        this.profitChart.nativeElement,
        {
          type: 'line',

          data: {
            labels:
              this.monthlyFinancials.map(
                item => item.month
              ),

            datasets: [
              {
                label: 'Laba Bersih',

                data:
                  this.monthlyFinancials.map(
                    item =>
                      item.income -
                      item.expense
                  ),

                borderColor: '#0D9488',

                backgroundColor:
                  'rgba(13,148,136,0.15)',

                borderWidth: 2.5,

                pointRadius: 4,

                pointBackgroundColor:
                  '#0D9488',

                pointBorderWidth: 0,

                fill: true,

                tension: 0.35
              }
            ]
          },

          options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
              legend: {
                display: false
              },

              tooltip: {
                backgroundColor: '#0F172A',
                padding: 10,

                callbacks: {
                  label: (context) =>
                    ` ${this.formatRupiah(
                      Number(context.raw)
                    )}`
                }
              }
            },

            scales: {
              x: {
                grid: {
                  display: false
                },

                ticks: {
                  color: '#94A3B8',
                  font: {
                    size: 11
                  }
                }
              },

              y: {
                beginAtZero: true,

                grid: {
                  color: '#F1F5F9'
                },

                ticks: {
                  color: '#94A3B8',
                  font: {
                    size: 10
                  },

                  callback: (
                    value: string | number
                  ) =>
                    `${Number(value) / 1000000}jt`
                }
              }
            }
          }
        }
      );
  }

  /* =========================
     NAVIGATION
  ========================= */

  navigate(page: string): void {
    console.log(
      'Navigate to:',
      page
    );
  }

  verifyPayment(
    payment: Payment
  ): void {
    console.log(
      'Verify payment:',
      payment
    );
  }

  rejectPayment(
    payment: Payment
  ): void {
    console.log(
      'Reject payment:',
      payment
    );
  }
}