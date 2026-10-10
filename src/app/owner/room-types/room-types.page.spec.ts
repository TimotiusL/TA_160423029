import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomTypesPage } from './room-types.page';

describe('RoomTypesPage', () => {
  let component: RoomTypesPage;
  let fixture: ComponentFixture<RoomTypesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RoomTypesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
