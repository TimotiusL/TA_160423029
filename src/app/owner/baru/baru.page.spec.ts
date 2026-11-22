import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaruPage } from './baru.page';

describe('BaruPage', () => {
  let component: BaruPage;
  let fixture: ComponentFixture<BaruPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BaruPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
