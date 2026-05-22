import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UsersService } from '@/modules/users/users.service';

import { Branch, type BranchDocument } from './schemas/branch.schema';
import type { CreateBranchDto } from './dto/create-branch.dto';
import type { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateBranchDto): Promise<BranchDocument> {
    const existing = await this.branchModel
      .findOne({ code: dto.code.toUpperCase() })
      .lean()
      .exec();
    if (existing) {
      throw new BadRequestException(`Branch code "${dto.code}" is already in use`);
    }
    return this.branchModel.create({ ...dto, code: dto.code.toUpperCase() });
  }

  findAll(activeOnly = false): Promise<BranchDocument[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return this.branchModel.find(filter).populate('manager', 'firstName lastName email').exec();
  }

  async findAllPaged(
    page = 1,
    limit = 20,
  ): Promise<{
    data: BranchDocument[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.branchModel
        .find()
        .populate('manager', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.branchModel.countDocuments().exec(),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
  }

  async findById(id: string): Promise<BranchDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Branch not found');
    const branch = await this.branchModel
      .findById(id)
      .populate('manager', 'firstName lastName email')
      .exec();
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto): Promise<BranchDocument> {
    await this.findById(id);
    const updated = await this.branchModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('manager', 'firstName lastName email')
      .exec();
    return updated!;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.branchModel.findByIdAndUpdate(id, { isActive: false });
  }

  async assignAdmin(branchId: string, adminId: string): Promise<BranchDocument> {
    const branch = await this.findById(branchId);
    const admin = await this.usersService.findById(adminId);
    if (!admin) throw new NotFoundException('User not found');
    if (admin.role !== 'branch_admin') {
      throw new BadRequestException('User must have role branch_admin');
    }
    // Clear previous assignment for that admin
    await this.branchModel.updateMany({ manager: adminId }, { $unset: { manager: 1 } });
    await this.usersService.update(adminId, { assignedBranch: new Types.ObjectId(branchId) });

    branch.manager = new Types.ObjectId(adminId);
    await branch.save();
    return branch.populate('manager', 'firstName lastName email');
  }

  findByAdmin(adminId: string): Promise<BranchDocument | null> {
    return this.branchModel
      .findOne({ manager: new Types.ObjectId(adminId) })
      .exec();
  }
}
