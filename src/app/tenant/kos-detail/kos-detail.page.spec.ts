import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KosDetailPage } from './kos-detail.page';

describe('KosDetailPage', () => {
  let component: KosDetailPage;
  let fixture: ComponentFixture<KosDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KosDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
