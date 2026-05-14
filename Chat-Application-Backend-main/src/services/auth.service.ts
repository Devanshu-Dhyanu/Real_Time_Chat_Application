import {
  BadRequestException,
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../schema/user.schema';
import {
  AddContactDto,
  UpdateContactDto,
  RegisterDto,
  LoginDto,
} from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user._id,
      email: user.email,
      username: user.username,
    };
    return {
      access_token: await this.jwtService.sign(payload),
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        publicKey: user.publicKey,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const exists = await this.userModel.findOne({
      $or: [{ email: normalizedEmail }, { username: dto.username }],
    });
    if (exists) {
      throw new ConflictException('Email Or Username Already Taken.');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      username: dto.username,
      email: normalizedEmail,
      password: hashed,
      contacts: [],
    });
    const { password, ...result } = user.toObject();
    return result;
  }

  async getProfile(userId: string) {
    return this.userModel.findById(userId).select('-password').lean();
  }

  async getAllUsers(isOnline?: string, currentUserId?: string) {
    const filter: any = {};
    if (currentUserId) {
      filter._id = { $ne: currentUserId };
    }
    if (isOnline) {
      filter.isOnline = isOnline;
    }
    return this.userModel.find(filter).select('-password').lean();
  }

  async getContacts(userId: string) {
    const owner = await this.userModel
      .findById(userId)
      .populate('contacts.userId', 'username email isOnline lastSeen avatarUrl')
      .select('contacts')
      .lean();

    if (!owner) {
      throw new NotFoundException('User not found');
    }

    const contacts = owner.contacts || [];
    const emails = contacts
      .map((contact: any) => (contact.email || contact.userId?.email)?.toLowerCase())
      .filter(Boolean);

    const matchedUsers = emails.length
      ? await this.userModel
          .find({ email: { $in: emails } })
          .select('-password')
          .lean()
      : [];

    const usersByEmail = new Map(
      matchedUsers.map((user: any) => [user.email?.toLowerCase(), user]),
    );

    return contacts.map((contact: any) => {
      const normalizedEmail = (contact.email || contact.userId?.email || '').toLowerCase();
      const matchedUser =
        usersByEmail.get(normalizedEmail) ||
        (contact.userId && typeof contact.userId === 'object' ? contact.userId : null);

      return {
        _id: normalizedEmail,
        email: normalizedEmail,
        displayName: contact.displayName || matchedUser?.username || normalizedEmail,
        user: matchedUser,
        isRegistered: Boolean(matchedUser),
        createdAt: contact.createdAt,
      };
    });
  }

  async addContact(userId: string, dto: AddContactDto) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const normalizedEmail = dto.contactEmail.trim().toLowerCase();

    const [owner, targetUser] = await Promise.all([
      this.userModel.findById(userId),
      this.userModel.findOne({ email: normalizedEmail }).select('-password').lean(),
    ]);

    if (!owner) {
      throw new NotFoundException('User not found');
    }

    if (owner.email === normalizedEmail) {
      throw new BadRequestException('You cannot save yourself as a contact.');
    }

    const existingContact = owner.contacts?.find(
      (contact: any) =>
        contact.email?.toLowerCase() === normalizedEmail ||
        String(contact.userId) === String(targetUser?._id),
    );

    if (existingContact) {
      existingContact.displayName = dto.displayName?.trim() || targetUser?.username || normalizedEmail;
      existingContact.email = normalizedEmail;
      if (targetUser?._id) {
        existingContact.userId = targetUser._id as any;
      }
    } else {
      owner.contacts.push({
        userId: targetUser?._id,
        email: normalizedEmail,
        displayName: dto.displayName?.trim() || targetUser?.username || normalizedEmail,
        createdAt: new Date(),
      } as any);
    }

    await owner.save();

    return {
      _id: normalizedEmail,
      email: normalizedEmail,
      displayName: dto.displayName?.trim() || targetUser?.username || normalizedEmail,
      user: targetUser,
      isRegistered: Boolean(targetUser),
    };
  }

  async updateContact(userId: string, contactEmail: string, dto: UpdateContactDto) {
    const [owner, targetUser] = await Promise.all([
      this.userModel.findById(userId),
      this.userModel.findOne({ email: decodeURIComponent(contactEmail).trim().toLowerCase() }),
    ]);
    if (!owner) {
      throw new NotFoundException('User not found');
    }

    const normalizedEmail = decodeURIComponent(contactEmail).trim().toLowerCase();
    const contact = owner.contacts?.find(
      (entry: any) =>
        entry.email?.toLowerCase() === normalizedEmail ||
        String(entry.userId) === String(targetUser?._id),
    );

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    contact.displayName = dto.displayName?.trim() || contact.displayName;
    contact.email = normalizedEmail;
    if (targetUser?._id) {
      contact.userId = targetUser._id as any;
    }
    await owner.save();

    const safeTargetUser = targetUser
      ? await this.userModel.findOne({ email: normalizedEmail }).select('-password').lean()
      : null;

    return {
      _id: normalizedEmail,
      email: normalizedEmail,
      displayName: contact.displayName,
      user: safeTargetUser,
      isRegistered: Boolean(safeTargetUser),
    };
  }

  async removeContact(userId: string, contactEmail: string) {
    const normalizedEmail = decodeURIComponent(contactEmail).trim().toLowerCase();
    const [owner, targetUser] = await Promise.all([
      this.userModel.findById(userId),
      this.userModel.findOne({ email: normalizedEmail }),
    ]);
    if (!owner) {
      throw new NotFoundException('User not found');
    }

    owner.contacts = (owner.contacts || []).filter(
      (entry: any) =>
        entry.email?.toLowerCase() !== normalizedEmail &&
        String(entry.userId) !== String(targetUser?._id),
    ) as any;

    await owner.save();
    return { success: true };
  }

  async updateProfilePhoto(userId: string, avatarUrl: string) {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { avatarUrl },
        { new: true },
      )
      .select('-password')
      .lean();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async updatePublicKey(userId: string, publicKey: string) {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { publicKey },
        { new: true },
      )
      .select('-password')
      .lean();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }
}
